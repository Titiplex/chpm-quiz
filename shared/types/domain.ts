export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'likert'
  | 'free_text'
  | 'free_text_short'
  | 'free_text_long'
  | 'number'
  | 'date'
  | 'information'

export type SubmissionStatus = 'draft' | 'submitted' | 'locked' | 'abandoned'
export type InvitationStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'in_progress'
  | 'draft'
  | 'submitted'
  | 'expired'
  | 'blocked'
  | 'cancelled'
export type LanguageCode = 'fr' | 'en' | 'es'
export type InvitationDeliveryMode = 'email' | 'email_simulation' | 'onsite_terminal' | 'paper_form' | 'refusal_record' | 'sms' | 'sms_simulation'
export type AssistanceMode = 'none' | 'technical_help' | 'full_assisted_entry'
export type TerminalDeviceStatus = 'active' | 'paused' | 'revoked'

export interface BuildingScope {
  id: string
  label: string
  country: string
  city: string
}

export interface QuestionnaireVersion {
  id: string
  title: string
  version: string
  language: LanguageCode
  isPublished: boolean
}

export interface QuestionDefinition {
  id: string
  code: string
  groupId: string
  title: string
  label?: string
  type: QuestionType
  responseType?: QuestionType
  answerScaleLabel: string
  helperText?: string | null
  popupTerm?: string | null
  popupBody?: string | null
}

export interface InvitationRecord {
  id: string
  questionnaireVersionId: string
  buildingId: string
  maskedEmail?: string | null
  publicCode: string
  status: InvitationStatus
}

export interface AnonymousSubmission {
  id: string
  publicCode: string
  questionnaireVersionId: string
  buildingId: string
  status: SubmissionStatus
  startedAt: string
  submittedAt?: string
}
