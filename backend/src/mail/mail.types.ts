export type MailTemplate =
  | 'invitation'
  | 'reminder'
  | 'expiration'
  | 'submission_confirmation'
  | 'submission_notification'
  | 'daily_digest'

export type MailProviderName = 'simulation' | 'brevo' | 'sendgrid' | 'mailjet'

export interface MailAddress {
  email: string
  name?: string | null
}

export interface MailJobPayload {
  template: MailTemplate
  to: MailAddress
  subject: string
  text: string
  html?: string
  invitationId?: string
  publicCode?: string
  metadata?: Record<string, unknown>
}

export interface MailDeliveryResult {
  provider: MailProviderName
  providerMessageId: string | null
  simulated: boolean
}
