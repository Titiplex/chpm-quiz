export type SmsTemplate = 'invitation' | 'reminder' | 'expiration'
export type SmsProviderName = 'disabled' | 'simulation' | 'twilio' | 'brevo'

export interface SmsJobPayload {
  template: SmsTemplate
  to: { phone: string }
  text: string
  invitationId?: string
  publicCode?: string
  metadata?: Record<string, unknown>
}

export interface SmsDeliveryResult {
  provider: SmsProviderName
  providerMessageId: string | null
  simulated: boolean
}
