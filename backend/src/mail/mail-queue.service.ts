import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { IdentityVaultService, type ClaimedOutboundJob } from '../identity-vault/identity-vault.service'
import { MailProviderService } from './mail-provider.service'
import type { MailJobPayload } from './mail.types'

@Injectable()
export class MailQueueService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name)
  private active = false
  private destroyed = false
  private timer?: NodeJS.Timeout

  constructor(
    private readonly provider: MailProviderService,
    private readonly identityVaultService: IdentityVaultService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.drain(), this.pollIntervalMs())
    this.timer.unref?.()
    void this.drain()
  }

  async enqueue(payload: MailJobPayload): Promise<string> {
    const maxAttempts = Math.max(Number(this.config.get<string>('EMAIL_JOB_MAX_ATTEMPTS', '3')), 1)
    const id = await this.identityVaultService.enqueueOutboundJob('email', payload as unknown as Record<string, unknown>, maxAttempts)
    await this.recordInvitationEvent(payload, 'email_job_queued', { jobId: id, template: payload.template, channel: 'email' })
    void this.drain()
    return id
  }

  async flush(): Promise<void> {
    while (!this.destroyed) {
      if (this.active) {
        await new Promise((resolve) => setTimeout(resolve, 5))
        continue
      }
      if (!(await this.drain())) break
    }
  }

  onModuleDestroy(): void {
    this.destroyed = true
    if (this.timer) clearInterval(this.timer)
  }

  private async drain(): Promise<boolean> {
    if (this.active || this.destroyed) return false
    this.active = true
    let processed = false
    try {
      while (!this.destroyed) {
        const entry = await this.identityVaultService.claimOutboundJob<MailJobPayload>('email')
        if (!entry) break
        processed = true
        await this.process(entry)
      }
    } finally {
      this.active = false
    }
    return processed
  }

  private async recordInvitationEvent(payload: MailJobPayload, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    if (!payload.invitationId || !payload.publicCode) return
    await this.identityVaultService.recordDeliveryEvent({
      invitationId: payload.invitationId,
      publicCode: payload.publicCode,
      eventType,
      providerMessageId: typeof metadata.providerMessageId === 'string' ? metadata.providerMessageId : undefined,
      metadata,
    }).catch((error: unknown) => this.logger.warn(`Email event recording failed: ${String(error)}`))
  }

  private async process(entry: ClaimedOutboundJob<MailJobPayload>): Promise<void> {
    await this.recordInvitationEvent(entry.payload, 'email_send_attempt', {
      jobId: entry.id,
      template: entry.payload.template,
      attempt: entry.attempt,
      maxAttempts: entry.maxAttempts,
    })
    try {
      const result = await this.provider.send(entry.payload)
      await this.identityVaultService.completeOutboundJob(entry.id, result.providerMessageId)
      await this.recordInvitationEvent(entry.payload, result.simulated ? 'email_send_simulated_success' : 'email_send_success', {
        jobId: entry.id,
        template: entry.payload.template,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        attempt: entry.attempt,
        simulated: result.simulated,
        ...entry.payload.metadata,
      })
      if (entry.payload.invitationId) await this.identityVaultService.markOutboundEmailSent(entry.payload.invitationId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const dead = entry.attempt >= entry.maxAttempts
      const delayMs = dead ? 0 : this.retryDelayMs(entry.attempt)
      await this.identityVaultService.retryOutboundJob(entry.id, message, new Date(Date.now() + delayMs), dead)
      await this.recordInvitationEvent(entry.payload, dead ? 'email_send_failure' : 'email_send_retry', {
        jobId: entry.id,
        template: entry.payload.template,
        attempt: entry.attempt,
        maxAttempts: entry.maxAttempts,
        error: message,
      })
      if (dead) this.logger.error(`Email ${entry.payload.template} permanently failed: ${message}`)
    }
  }

  private retryDelayMs(attempt: number): number {
    const base = Math.max(Number(this.config.get<string>('EMAIL_JOB_RETRY_DELAY_MS', '1000')), 0)
    return Math.min(3_600_000, base * 2 ** Math.max(attempt - 1, 0))
  }

  private pollIntervalMs(): number {
    return Math.min(Math.max(Number(this.config.get<string>('DELIVERY_QUEUE_POLL_MS', '2000')), 250), 60_000)
  }
}
