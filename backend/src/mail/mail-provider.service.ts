import { randomUUID } from 'node:crypto'

import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { MailDeliveryResult, MailJobPayload, MailProviderName } from './mail.types'

@Injectable()
export class MailProviderService {
  private readonly logger = new Logger(MailProviderService.name)

  constructor(private readonly config: ConfigService) {}

  async send(payload: MailJobPayload): Promise<MailDeliveryResult> {
    const provider = this.provider()

    if (provider === 'simulation') {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('EMAIL_PROVIDER=simulation est interdit en production')
      }

      const providerMessageId = `sim-${randomUUID()}`
      this.logger.log(`Email simulé ${payload.template} vers ${this.mask(payload.to.email)} (${providerMessageId})`)
      return { provider, providerMessageId, simulated: true }
    }

    if (provider === 'brevo') return this.sendBrevo(payload)
    if (provider === 'sendgrid') return this.sendSendgrid(payload)
    if (provider === 'mailjet') return this.sendMailjet(payload)

    throw new ServiceUnavailableException(`Provider email non supporté : ${provider}`)
  }

  private provider(): MailProviderName {
    const rawProvider = this.config.get<string>('EMAIL_PROVIDER', this.isProduction() ? '' : 'simulation').trim().toLowerCase()

    if (rawProvider === 'brevo' || rawProvider === 'sendgrid' || rawProvider === 'mailjet' || rawProvider === 'simulation') {
      return rawProvider
    }

    throw new ServiceUnavailableException('EMAIL_PROVIDER doit valoir brevo, sendgrid, mailjet ou simulation')
  }

  private async sendBrevo(payload: MailJobPayload): Promise<MailDeliveryResult> {
    const apiKey = this.requiredSecret('BREVO_API_KEY')
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: this.sender(),
        to: [payload.to],
        subject: payload.subject,
        htmlContent: payload.html ?? this.textToHtml(payload.text),
        textContent: payload.text,
        tags: ['chpm', payload.template],
        params: payload.metadata ?? {},
      }),
    })

    const body = await this.readBody(response)
    if (!response.ok) {
      throw new ServiceUnavailableException(`Brevo a refusé l'email (${response.status}) : ${body}`)
    }

    const parsed = this.tryParse(body)
    return { provider: 'brevo', providerMessageId: this.extractString(parsed, 'messageId') ?? null, simulated: false }
  }

  private async sendSendgrid(payload: MailJobPayload): Promise<MailDeliveryResult> {
    const apiKey = this.requiredSecret('SENDGRID_API_KEY')
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [payload.to], custom_args: this.stringifyMetadata(payload.metadata) }],
        from: this.sender(),
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.text },
          { type: 'text/html', value: payload.html ?? this.textToHtml(payload.text) },
        ],
        categories: ['chpm', payload.template],
      }),
    })

    const body = await this.readBody(response)
    if (!response.ok) {
      throw new ServiceUnavailableException(`SendGrid a refusé l'email (${response.status}) : ${body}`)
    }

    return { provider: 'sendgrid', providerMessageId: response.headers.get('x-message-id'), simulated: false }
  }

  private async sendMailjet(payload: MailJobPayload): Promise<MailDeliveryResult> {
    const publicKey = this.requiredSecret('MAILJET_API_KEY')
    const privateKey = this.requiredSecret('MAILJET_API_SECRET')
    const auth = Buffer.from(`${publicKey}:${privateKey}`, 'utf8').toString('base64')
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: this.sender(),
            To: [payload.to],
            Subject: payload.subject,
            TextPart: payload.text,
            HTMLPart: payload.html ?? this.textToHtml(payload.text),
            CustomCampaign: `chpm-${payload.template}`,
            CustomID: payload.publicCode ?? payload.invitationId ?? undefined,
          },
        ],
      }),
    })

    const body = await this.readBody(response)
    if (!response.ok) {
      throw new ServiceUnavailableException(`Mailjet a refusé l'email (${response.status}) : ${body}`)
    }

    const parsed = this.tryParse(body) as { Messages?: Array<{ To?: Array<{ MessageID?: string | number }> }> } | null
    const messageId = parsed?.Messages?.[0]?.To?.[0]?.MessageID
    return { provider: 'mailjet', providerMessageId: messageId ? String(messageId) : null, simulated: false }
  }

  private sender(): { email: string; name?: string } {
    const email = this.config.get<string>('EMAIL_FROM')?.trim()
    if (!email) {
      throw new ServiceUnavailableException('EMAIL_FROM est obligatoire pour envoyer des emails réels')
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('EMAIL_FROM doit être une adresse email valide')
    }

    const name = this.config.get<string>('EMAIL_FROM_NAME', 'CHPM Questionnaires').trim()
    return { email, ...(name ? { name } : {}) }
  }

  private requiredSecret(name: string): string {
    const value = this.config.get<string>(name)?.trim()
    if (!value) {
      throw new ServiceUnavailableException(`${name} est obligatoire pour EMAIL_PROVIDER=${this.provider()}`)
    }
    return value
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production'
  }

  private textToHtml(text: string): string {
    return text
      .split('\n')
      .map((line) => line.trim() ? `<p>${this.escapeHtml(line)}</p>` : '<br>')
      .join('')
  }

  private escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return await response.text()
    } catch {
      return ''
    }
  }

  private tryParse(body: string): unknown {
    try {
      return body ? JSON.parse(body) : null
    } catch {
      return null
    }
  }

  private extractString(payload: unknown, key: string): string | null {
    if (typeof payload !== 'object' || payload === null || !(key in payload)) return null
    const value = (payload as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : null
  }

  private stringifyMetadata(metadata: Record<string, unknown> | undefined): Record<string, string> | undefined {
    if (!metadata) return undefined
    return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]))
  }

  private mask(email: string): string {
    const [local = '', domain = ''] = email.split('@')
    return `${local.slice(0, 2)}***@${domain}`
  }
}
