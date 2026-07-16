import { Injectable } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditEventInput {
  actor?: AuthenticatedUser | null
  action: string
  entityType: string
  entityId?: string | null
  publicCode?: string | null
  metadata?: Record<string, unknown> | null
  request?: Request
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actor?.id,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        publicCode: input.publicCode ?? undefined,
        metadata: input.metadata ?? undefined,
        ipAddress: input.request?.ip,
        userAgent: input.request?.get('user-agent'),
      },
    })
  }

  async list(limit?: number) {
    const take = typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : undefined

    return this.prisma.auditLog.findMany({
      orderBy: { occurredAt: 'desc' },
      ...(take ? { take } : {}),
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }
}
