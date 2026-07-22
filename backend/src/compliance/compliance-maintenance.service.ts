import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { IdentityVaultService } from '../identity-vault/identity-vault.service'
import { PrismaService } from '../prisma/prisma.service'

const DAY_MS = 24 * 60 * 60 * 1_000

@Injectable()
export class ComplianceMaintenanceService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ComplianceMaintenanceService.name)
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly identityVault: IdentityVaultService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.enabled()) return
    void this.runOnce().catch((error: unknown) =>
      this.logger.error(`Initial retention run failed: ${String(error)}`),
    )
    this.timer = setInterval(() => {
      void this.runOnce().catch((error: unknown) =>
        this.logger.error(`Scheduled retention run failed: ${String(error)}`),
      )
    }, this.intervalMs())
    this.timer.unref?.()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(actor?: AuthenticatedUser, request?: Request) {
    if (this.running) return { skipped: true, reason: 'already_running' }
    this.running = true
    try {
      const now = new Date()
      const draftCutoff = this.cutoff(now, 'DRAFT_RETENTION_DAYS', 45)
      const identityCutoff = this.cutoff(now, 'IDENTITY_RETENTION_DAYS', 365)
      const auditCutoff = this.cutoff(now, 'AUDIT_RETENTION_DAYS', 730)
      const responseCutoff = this.cutoff(now, 'RESPONSE_RETENTION_DAYS', 730)

      const expiredInvitations = await this.prisma.invitation.updateMany({
        where: {
          status: { in: ['sent', 'opened', 'in_progress', 'draft'] },
          expiresAt: { lt: now },
        },
        data: { status: 'expired' },
      })
      const deletedDrafts = await this.prisma.responseSession.deleteMany({
        where: {
          status: { in: ['draft', 'abandoned'] },
          submittedAt: null,
          lastSeenAt: { lt: draftCutoff },
          invitation: { OR: [{ status: 'expired' }, { expiresAt: { lt: now } }] },
        },
      })
      const deletedSubmittedSessions = await this.prisma.responseSession.deleteMany({
        where: { status: 'locked', submittedAt: { lt: responseCutoff } },
      })
      const identity = await this.identityVault.purgeByRetention(identityCutoff, auditCutoff, now)
      const deletedAudit = await this.prisma.auditLog.deleteMany({
        where: { occurredAt: { lt: auditCutoff } },
      })
      const expiredExports = await this.prisma.judicialAccessRequest.updateMany({
        where: { exportExpiresAt: { lt: now }, exportDeletedAt: null },
        data: { exportDeletedAt: now },
      })

      const result = {
        skipped: false,
        executedAt: now.toISOString(),
        expiredInvitationCount: expiredInvitations.count,
        deletedDraftSessionCount: deletedDrafts.count,
        deletedSubmittedSessionCount: deletedSubmittedSessions.count,
        deletedAuditCount: deletedAudit.count,
        expiredExportCount: expiredExports.count,
        ...identity,
      }
      this.logger.log(JSON.stringify({ event: 'retention.completed', ...result }))
      if (actor) {
        await this.audit.log({
          actor,
          action: 'compliance.retention_cycle',
          entityType: 'RetentionCycle',
          request,
          metadata: result,
        })
      }
      return result
    } finally {
      this.running = false
    }
  }

  private enabled(): boolean {
    return (
      this.config.get<boolean>('ENABLE_RETENTION_WORKER', false) === true ||
      this.config.get<string>('ENABLE_RETENTION_WORKER') === 'true'
    )
  }

  private intervalMs(): number {
    const value = Number(this.config.get<string>('RETENTION_WORKER_INTERVAL_MINUTES', '1440'))
    const minutes = Number.isFinite(value)
      ? Math.min(Math.max(Math.floor(value), 60), 10_080)
      : 1_440
    return minutes * 60_000
  }

  private cutoff(now: Date, key: string, fallbackDays: number): Date {
    const value = Number(this.config.get<string>(key, String(fallbackDays)))
    const days = Number.isFinite(value) && value > 0 ? value : fallbackDays
    return new Date(now.getTime() - days * DAY_MS)
  }
}
