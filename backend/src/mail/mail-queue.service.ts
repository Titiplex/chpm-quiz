import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { IdentityVaultService } from '../identity-vault/identity-vault.service'
import { MailProviderService } from './mail-provider.service'
import type { MailJobPayload } from './mail.types'

type QueueEntry = {
  id: string
  payload: MailJobPayload
  attempt: number
  maxAttempts: number
}

@Injectable()
export class MailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name)
  private readonly queue: QueueEntry[] = []
  private active = false
  private destroyed = false

  constructor(
    private readonly provider: MailProviderService,
    private readonly identityVaultService: IdentityVaultService,
    private readonly config: ConfigService,
  ) {}

  enqueue(payload: MailJobPayload): string {
    const id = `mail_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const maxAttempts = Math.max(Number(this.config.get<string>('EMAIL_JOB_MAX_ATTEMPTS', '3')), 1)
    this.queue.push({ id, payload, attempt: 0, maxAttempts })

    void this.recordInvitationEvent(payload, 'email_job_queued', {
      jobId: id,
      template: payload.template,
      channel: 'email',
    })

    this.drainSoon()
    return id
  }

  async flush(): Promise<void> {
    while (this.queue.length || this.active) {
      await this.drain()
      if (this.active) await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  onModuleDestroy(): void {
    this.destroyed = true
  }

  private drainSoon(): void {
    if (this.destroyed) return
    setTimeout(() => void this.drain(), 0).unref?.()
  }

  private async drain(): Promise<void> {
    if (this.active || this.destroyed) return
    this.active = true

    try {
      while (this.queue.length && !this.destroyed) {
        const entry = this.queue.shift()!
        await this.process(entry)
      }
    } finally {
      this.active = false
    }
  }


  private async recordInvitationEvent(payload: MailJobPayload, eventType: string, metadata: Record<string, unknown>): Promise<void> {
    if (!payload.invitationId || !payload.publicCode) {
      return
    }

    await this.identityVaultService.recordDeliveryEvent({
      invitationId: payload.invitationId,
      publicCode: payload.publicCode,
      eventType,
      providerMessageId: typeof metadata.providerMessageId === 'string' ? metadata.providerMessageId : undefined,
      metadata,
    }).catch((error: unknown) => this.logger.warn(`Journalisation email impossible: ${String(error)}`))
  }

  private async process(entry: QueueEntry): Promise<void> {
    entry.attempt += 1

    await this.recordInvitationEvent(entry.payload, 'email_send_attempt', {
      jobId: entry.id,
      template: entry.payload.template,
      attempt: entry.attempt,
      maxAttempts: entry.maxAttempts,
    })

    try {
      const result = await this.provider.send(entry.payload)
      await this.recordInvitationEvent(entry.payload, result.simulated ? 'email_send_simulated_success' : 'email_send_success', {
        jobId: entry.id,
        template: entry.payload.template,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        attempt: entry.attempt,
        simulated: result.simulated,
        ...entry.payload.metadata,
      })
      if (entry.payload.invitationId) {
        await this.identityVaultService.markOutboundEmailSent(entry.payload.invitationId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.recordInvitationEvent(entry.payload, entry.attempt < entry.maxAttempts ? 'email_send_retry' : 'email_send_failure', {
        jobId: entry.id,
        template: entry.payload.template,
        attempt: entry.attempt,
        maxAttempts: entry.maxAttempts,
        error: message,
      })

      if (entry.attempt < entry.maxAttempts) {
        const baseDelayMs = Math.max(Number(this.config.get<string>('EMAIL_JOB_RETRY_DELAY_MS', '1000')), 0)
        const delayMs = Math.min(30_000, baseDelayMs * 2 ** (entry.attempt - 1))
        if (delayMs === 0) {
          this.queue.push(entry)
          return
        }
        setTimeout(() => {
          this.queue.push(entry)
          this.drainSoon()
        }, delayMs).unref?.()
        return
      }

      this.logger.error(`Email ${entry.payload.template} définitivement échoué: ${message}`)
    }
  }
}
