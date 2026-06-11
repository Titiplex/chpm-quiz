export type QuestionType = 'single_choice' | 'likert' | 'free_text' | 'information'
export type SubmissionStatus = 'draft' | 'submitted' | 'locked'
export type InvitationStatus = 'sent' | 'completed' | 'pending' | 'blocked' | 'expired'
export type LanguageCode = 'fr' | 'en' | 'es'

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
  type: QuestionType
  answerScaleLabel: string
  helperText?: string
  popupTerm?: string
  popupBody?: string
}

export interface InvitationRecord {
  id: string
  questionnaireVersionId: string
  buildingId: string
  email: string
  uniqueCode: string
  status: InvitationStatus
}

export interface AnonymousSubmission {
  id: string
  uniqueCode: string
  questionnaireVersionId: string
  buildingId: string
  status: SubmissionStatus
  startedAt: string
  submittedAt?: string
}
