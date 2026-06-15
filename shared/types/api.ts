import type { BuildingScope, InvitationStatus, LanguageCode, QuestionDefinition, QuestionType, SubmissionStatus } from './domain'
import type { Permission, UserRole } from './rbac'

export interface ApiBuilding extends BuildingScope {
  code: string
  timezone: string
  siteId?: string
  organizationId?: string
}

export interface AuthUserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  permissions: Permission[]
  building: ApiBuilding | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: AuthUserProfile
}

export interface ApiLikertScale {
  id: string
  points: number
  minValue?: number
  leftAnchor: string
  rightAnchor: string
  neutralLabel: string | null
  allowNotApplicable: boolean
  orientation: string
}

export interface ApiAnswerOption {
  id: string
  value: string
  label: string
  displayOrder: number
}

export interface ApiPopupDefinition {
  id: string
  termKey: string
  language: string
  title: string
  body: string
  version: string
  termLabel?: string
}

export interface ApiQuestion extends Omit<QuestionDefinition, 'groupId'> {
  id: string
  type: QuestionType
  responseType?: QuestionType
  displayOrder: number
  isRequired?: boolean
  likertScale?: ApiLikertScale | null
  options?: ApiAnswerOption[]
  popupDefinitions?: ApiPopupDefinition[]
}

export interface ApiQuestionGroup {
  id: string
  title: string
  description: string | null
  displayOrder: number
  questionsPerPage?: number
  randomize: boolean
  questions: ApiQuestion[]
}

export interface ApiQuestionnaire {
  id: string
  code: string
  title: string
  description?: string | null
  defaultLanguage: LanguageCode
  versionId: string
  version: string
  versionLabel: string
  language: LanguageCode
  finality?: string | null
  status: string
  isPublished: boolean
  openFrom?: string | null
  openUntil?: string | null
  groupCount: number
  questionCount: number
  groups: ApiQuestionGroup[]
}

export interface BuildingsResponse {
  buildings: ApiBuilding[]
}

export interface QuestionnairesResponse {
  questionnaires: ApiQuestionnaire[]
}

export interface QuestionnaireResponse {
  questionnaire: ApiQuestionnaire
}

export interface CreateQuestionnaireRequest {
  code: string
  title: string
  description?: string
  defaultLanguage?: LanguageCode
  finality?: string
}

export interface UpdateQuestionnaireRequest {
  title?: string
  description?: string
  defaultLanguage?: LanguageCode
  finality?: string
}

export interface CreateQuestionGroupRequest {
  title: string
  description?: string
  displayOrder?: number
  questionsPerPage?: number
  randomize?: boolean
}

export interface UpdateQuestionGroupRequest {
  title?: string
  description?: string
  displayOrder?: number
  questionsPerPage?: number
  randomize?: boolean
}

export interface LikertScaleRequest {
  points: number
  minValue?: number
  leftAnchor: string
  rightAnchor: string
  neutralLabel?: string
  allowNotApplicable?: boolean
}

export interface PopupDefinitionRequest {
  title: string
  body: string
  termsExplained?: string[]
}

export interface CreateQuestionRequest {
  code: string
  label: string
  helperText?: string
  responseType: Extract<QuestionType, 'free_text' | 'free_text_short' | 'free_text_long' | 'likert'>
  isRequired?: boolean
  displayOrder?: number
  likertScale?: LikertScaleRequest
  popupDefinition?: PopupDefinitionRequest
}

export interface UpdateQuestionRequest {
  code?: string
  label?: string
  helperText?: string
  responseType?: Extract<QuestionType, 'free_text' | 'free_text_short' | 'free_text_long' | 'likert'>
  isRequired?: boolean
  displayOrder?: number
  likertScale?: LikertScaleRequest
  popupDefinition?: PopupDefinitionRequest | null
}

export interface ApiInvitation {
  id: string
  publicCode: string
  status: InvitationStatus
  maskedEmail: string | null
  questionnaireVersionId: string
  questionnaireTitle: string | null
  versionLabel: string | null
  building: ApiBuilding
  expiresAt: string
  sentAt: string | null
  openedAt: string | null
  startedAt: string | null
  submittedAt: string | null
  responseStatus: SubmissionStatus | null
}

export interface InvitationsResponse {
  invitations: ApiInvitation[]
}

export interface CreateInvitationRequest {
  questionnaireVersionId: string
  buildingId: string
  email: string
  notifyModerator?: boolean
  notifyAdmins?: boolean
}

export interface CreateInvitationResponse {
  invitation: ApiInvitation
  accessToken: string
  devAccessLink: string
}

export interface RespondentAnswer {
  id: string
  questionId: string
  value: unknown
  identifiabilityWarning?: boolean
  warningReason?: string | null
}

export interface RespondentQuestion extends ApiQuestion {
  label: string
  responseType: QuestionType
  answer: RespondentAnswer | null
}

export interface RespondentQuestionGroup {
  id: string
  title: string
  description: string | null
  questionsPerPage: number
  randomize: boolean
  questions: RespondentQuestion[]
}

export interface RespondentSessionResponse {
  responseSession: {
    id: string
    publicCode: string
    status: SubmissionStatus
    currentPage: number
    startedAt: string
    submittedAt: string | null
    lockedAt: string | null
  }
  invitation: {
    publicCode: string
    status: InvitationStatus
    expiresAt: string
    building: ApiBuilding
  }
  questionnaire: {
    id: string
    versionId: string
    title: string
    description: string | null
    finality: string | null
    versionLabel: string
    language: LanguageCode
    groups: RespondentQuestionGroup[]
  }
}

export interface SaveAnswersRequest {
  token: string
  answers: Array<{ questionId: string; value: unknown }>
}

export interface SaveAnswersResponse {
  savedAnswers: RespondentAnswer[]
  warnings: Array<{ questionId: string; reason: string | null }>
}

export interface TelemetryRequest {
  token: string
  questionId?: string
  popupDefinitionId?: string
  eventType: string
  eventPayload?: Record<string, unknown>
  durationMs?: number
  occurredAt?: string
}

export interface SubmitResponse {
  submission: {
    id: string
    publicCode: string
    submittedAt: string
    answerCount: number
  }
}

export interface StatsResponse {
  stats: {
    questionnaire: { id: string; code: string; title: string }
    threshold: number
    totals: {
      invited: number
      started: number
      submitted: number
      abandoned: number
      expired: number
      completionRate: number
      telemetryEvents: number
      popupOpens: number
    }
    versions: Array<{
      id: string
      versionLabel: string
      status: string
      invited: number
      started: number
      submitted: number
      completionRate: number
      effectifSufficient: boolean
    }>
    buildings: Array<{
      buildingId: string
      label: string
      invited: number
      started: number
      submitted: number
      effectifSufficient: boolean
      completionRate: number
      displayValue: string
    }>
    questions: Array<{
      id: string
      code: string
      label: string
      responseType: QuestionType
      answerCount: number
      popupOpens: number
      effectifSufficient: boolean
    }>
  }
}
