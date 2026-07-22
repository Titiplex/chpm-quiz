import { randomUUID } from 'node:crypto'

import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { SmsDeliveryResult, SmsJobPayload, SmsProviderName } from './sms.types'

@Injectable()
export class SmsProviderService {
  private readonly logger = new Logger(SmsProviderService.name)

  constructor(private readonly config: ConfigService) {}

  async send(payload: SmsJobPayload): Promise<SmsDeliveryResult> {
    const provider = this.provider()

    if (provider === 'disabled') {
      throw new ServiceUnavailableException('SMS_PROVIDER=disabled : envoi SMS non configuré')
    }

    if (provider === 'simulation') {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('SMS_PROVIDER=simulation est interdit en production')
      }

      const providerMessageId = `sms-sim-${randomUUID()}`
      this.logger.log(`SMS simulé ${payload.template} vers ${this.mask(payload.to.phone)} (${providerMessageId})`)
      return { provider, providerMessageId, simulated: true }
    }

    if (provider === 'twilio') return this.sendTwilio(payload)
    if (provider === 'brevo') return this.sendBrevo(payload)

    throw new ServiceUnavailableException(`Provider SMS non supporté : ${provider}`)
  }

  private provider(): SmsProviderName {
    const rawProvider = this.config.get<string>('SMS_PROVIDER', this.isProduction() ? 'disabled' : 'simulation').trim().toLowerCase()

    if (rawProvider === 'disabled' || rawProvider === 'simulation' || rawProvider === 'twilio' || rawProvider === 'brevo') {
      return rawProvider
    }

    throw new ServiceUnavailableException('SMS_PROVIDER doit valoir disabled, simulation, twilio ou brevo')
  }

  private async sendTwilio(payload: SmsJobPayload): Promise<SmsDeliveryResult> {
    const accountSid = this.requiredSecret('TWILIO_ACCOUNT_SID')
    const authToken = this.requiredSecret('TWILIO_AUTH_TOKEN')
    const from = this.requiredPhone('TWILIO_FROM')
    const auth = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64')
    const response = await this.fetchProvider(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: payload.to.phone, Body: payload.text }),
    })

    const body = await this.readBody(response)
    if (!response.ok) {
      throw new ServiceUnavailableException(`Twilio a refusé le SMS (${response.status}) : ${body}`)
    }

    const parsed = this.tryParse(body)
    return { provider: 'twilio', providerMessageId: this.extractString(parsed, 'sid'), simulated: false }
  }

  private async sendBrevo(payload: SmsJobPayload): Promise<SmsDeliveryResult> {
    const apiKey = this.requiredSecret('BREVO_API_KEY')
    const sender = this.config.get<string>('SMS_SENDER', 'CHPM').trim().slice(0, 11)
    const response = await this.fetchProvider('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        recipient: payload.to.phone,
        content: payload.text,
        tag: `chpm-${payload.template}`,
      }),
    })

    const body = await this.readBody(response)
    if (!response.ok) {
      throw new ServiceUnavailableException(`Brevo a refusé le SMS (${response.status}) : ${body}`)
    }

    const parsed = this.tryParse(body)
    return { provider: 'brevo', providerMessageId: this.extractString(parsed, 'messageId') ?? this.extractString(parsed, 'reference'), simulated: false }
  }

  private requiredSecret(name: string): string {
    const value = this.config.get<string>(name)?.trim()
    if (!value) {
      throw new ServiceUnavailableException(`${name} est obligatoire pour SMS_PROVIDER=${this.provider()}`)
    }
    return value
  }

  private fetchProvider(url: string, init: RequestInit): Promise<Response> {
    const timeoutMs = Math.min(Math.max(Number(this.config.get<string>('PROVIDER_HTTP_TIMEOUT_MS', '10000')), 1_000), 60_000)
    return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  }

  private requiredPhone(name: string): string {
    const value = this.requiredSecret(name)
    if (!/^\+[1-9]\d{7,14}$/.test(value)) {
      throw new BadRequestException(`${name} doit être un numéro E.164, par exemple +33600000000`)
    }
    return value
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production'
  }

  private async readBody(response: Response): Promise<string> {
    try {
      return await response.text()
    } catch {
      return ''
    }
  }

  private tryParse(body: string): Record<string, unknown> | null {
    try {
      return JSON.parse(body) as Record<string, unknown>
    } catch {
      return null
    }
  }

  private extractString(input: Record<string, unknown> | null, key: string): string | null {
    const value = input?.[key]
    return typeof value === 'string' || typeof value === 'number' ? String(value) : null
  }

  private mask(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : 'téléphone masqué'
  }
}
