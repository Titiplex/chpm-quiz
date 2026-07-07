import type { AssistanceMode, BuildingScope, InvitationDeliveryMode, InvitationStatus, LanguageCode, QuestionDefinition, QuestionType, SubmissionStatus, TerminalDeviceStatus } from './domain'
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


export interface ApiSiteTeamUser {
  id: string
  email: string
  displayName: string
  role: Extract<UserRole, 'site_manager' | 'moderator'>
  roleLabel: string
  isActive: boolean
  organizationId: string | null
  siteId: string | null
  buildingId: string | null
  site: { id: string; code: string; name: string } | null
  building: ApiBuilding | null
  createdAt: string
  updatedAt: string
}

export interface SiteTeamResponse {
  users: ApiSiteTeamUser[]
  policy: {
    manageableRoles: Array<Extract<UserRole, 'moderator'>>
    scope: 'site' | 'organization'
    passwordReturnedOnce: boolean
  }
}

export interface CreateSiteModeratorRequest {
  email: string
  displayName: string
  buildingId: string
  temporaryPassword?: string
}

export interface SiteModeratorMutationResponse {
  user: ApiSiteTeamUser
  temporaryPassword?: string
  temporaryPasswordGenerated?: boolean
}

export interface UpdateSiteModeratorRequest {
  displayName?: string
  buildingId?: string
  isActive?: boolean
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
  glossaryTermId?: string | null
  termLabel?: string
  termDefinition?: string
}

export interface ConditionExpression {
  questionId?: string
  questionCode?: string
  operator?: 'answered' | 'not_answered' | 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'
  value?: unknown
  equals?: unknown
  all?: ConditionExpression[]
  any?: ConditionExpression[]
  not?: ConditionExpression
}

export interface ApiQuestion extends Omit<QuestionDefinition, 'groupId'> {
  id: string
  type: QuestionType
  responseType?: QuestionType
  displayOrder: number
  isRequired?: boolean
  conditionExpression?: ConditionExpression | null
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
  conditionExpression?: ConditionExpression | null
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
  conditionExpression?: ConditionExpression | null
}

export interface UpdateQuestionGroupRequest {
  title?: string
  description?: string
  displayOrder?: number
  questionsPerPage?: number
  randomize?: boolean
  conditionExpression?: ConditionExpression | null
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
  responseType: Extract<QuestionType, 'free_text' | 'free_text_short' | 'free_text_long' | 'likert' | 'single_choice' | 'multiple_choice' | 'number' | 'date' | 'information'>
  isRequired?: boolean
  displayOrder?: number
  conditionExpression?: ConditionExpression | null
  likertScale?: LikertScaleRequest
  answerOptions?: Array<{ value: string; label: string; displayOrder?: number; isExclusive?: boolean }>
  popupDefinition?: PopupDefinitionRequest
}

export interface UpdateQuestionRequest {
  code?: string
  label?: string
  helperText?: string
  responseType?: Extract<QuestionType, 'free_text' | 'free_text_short' | 'free_text_long' | 'likert' | 'single_choice' | 'multiple_choice' | 'number' | 'date' | 'information'>
  isRequired?: boolean
  displayOrder?: number
  conditionExpression?: ConditionExpression | null
  likertScale?: LikertScaleRequest
  answerOptions?: Array<{ value: string; label: string; displayOrder?: number; isExclusive?: boolean }>
  popupDefinition?: PopupDefinitionRequest | null
}

export interface PublicationCheckResponse {
  report: {
    canPublish: boolean
    errors: string[]
  }
}

export interface VersionResponse {
  version: {
    id: string
    versionLabel: string
    status: string
    publishedAt?: string | null
    immutableAt?: string | null
  }
}

export interface ApiTerminalDevice {
  id: string
  code: string
  label: string
  status: TerminalDeviceStatus
  building: ApiBuilding
  lastSeenAt: string | null
  pendingInvitationCount: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiInvitation {
  id: string
  publicCode: string
  status: InvitationStatus
  deliveryMode: InvitationDeliveryMode
  assistanceMode: AssistanceMode
  maskedEmail: string | null
  questionnaireVersionId: string
  questionnaireTitle: string | null
  versionLabel: string | null
  building: ApiBuilding
  terminalDevice: ApiTerminalDevice | null
  terminalDispatchedAt: string | null
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


export interface TerminalDevicesResponse {
  terminalDevices: ApiTerminalDevice[]
}

export interface RegisterTerminalDeviceRequest {
  buildingId: string
  label: string
}

export interface RegisterTerminalDeviceResponse {
  terminalDevice: ApiTerminalDevice
  terminalAccessToken: string
  terminalLaunchLink: string
}


export interface UpdateTerminalDeviceRequest {
  label?: string
  status?: TerminalDeviceStatus
}

export interface TerminalDeviceMutationResponse {
  terminalDevice: ApiTerminalDevice
}

export interface RegenerateTerminalDeviceTokenResponse {
  terminalDevice: ApiTerminalDevice
  terminalAccessToken: string
  terminalLaunchLink: string
}

export interface TerminalSessionResponse {
  terminalDevice: ApiTerminalDevice
  invitations: ApiInvitation[]
}

export interface OpenTerminalInvitationResponse {
  invitation: ApiInvitation
  accessToken: string
  respondentAccessLink: string
}

export interface CreateInvitationRequest {
  questionnaireVersionId: string
  buildingId: string
  email?: string
  deliveryMode?: InvitationDeliveryMode
  terminalDeviceId?: string
  assistanceMode?: AssistanceMode
  expiresAt?: string
  notifyModerator?: boolean
  notifyAdmins?: boolean
}

export interface CreateInvitationResponse {
  invitation: ApiInvitation
  accessToken: string | null
  devAccessLink: string | null
  terminalDispatchLink?: string | null
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
  legalNotice?: {
    finality: string
    estimatedDurationMinutes: number
    rights: string
    dpoContact: string
    pseudonymizationStatus: string
  }
  invitation: {
    publicCode: string
    status: InvitationStatus
    expiresAt: string
    building: ApiBuilding
    deliveryMode: InvitationDeliveryMode
    assistanceMode: AssistanceMode
    terminalDevice: ApiTerminalDevice | null
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
  terminalToken?: string
  answers: Array<{ questionId: string; value: unknown }>
}

export interface SaveAnswersResponse {
  savedAnswers: RespondentAnswer[]
  warnings: Array<{ questionId: string; reason: string | null }>
}

export interface TelemetryRequest {
  token: string
  terminalToken?: string
  questionId?: string
  popupDefinitionId?: string
  eventType: string
  eventPayload?: Record<string, unknown>
  currentPage?: number
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
      opened: number
      started: number
      submitted: number
      abandoned: number
      expired: number
      openingRate: number
      startRate: number
      submissionRate: number
      completionRate: number
      abandonmentRate: number
      telemetryEvents: number
      popupOpens: number
      answerChanges: number
      backtracks: number
      resumes: number
      medianTotalDurationMs: number | null
    }
    versions: Array<{
      id: string
      versionLabel: string
      status: string
      invited: number
      opened: number
      started: number
      submitted: number
      abandoned: number
      openingRate: number
      startRate: number
      submissionRate: number
      completionRate: number
      abandonmentRate: number
      effectifSufficient: boolean
    }>
    deliveryModes: Array<{
      mode: InvitationDeliveryMode
      label: string
      invited: number
      opened: number
      started: number
      submitted: number
      openingRate: number
      startRate: number
      submissionRate: number
    }>
    buildings: Array<{
      buildingId: string
      label: string
      invited: number | null
      opened: number | null
      started: number | null
      submitted: number | null
      effectifSufficient: boolean
      openingRate: number | null
      startRate: number | null
      submissionRate: number | null
      completionRate: number | null
      displayValue: string
    }>
    sites?: Array<{
      siteId: string
      label: string
      invited: number
      opened: number
      started: number
      submitted: number
      openingRate: number
      startRate: number
      submissionRate: number
    }>
    languages?: Array<{
      language: string
      versionCount: number
      invited: number
      submitted: number
      submissionRate: number
    }>
    popups?: Array<{
      id: string
      termKey: string
      title: string
      questionId: string
      questionCode: string
      groupId: string
      groupTitle: string
      versionId: string
      versionLabel: string
      openedCount: number | null
      respondentCount: number | null
      effectifSufficient: boolean
      displayValue: string
    }>
    groups: Array<{
      id: string
      title: string
      versionId: string
      versionLabel: string
      questionCount: number
      answerCount: number | null
      respondentCount: number | null
      popupOpens: number | null
      medianDurationMs: number | null
      effectifSufficient: boolean
      displayValue: string
    }>
    questions: Array<{
      id: string
      code: string
      label: string
      responseType: QuestionType
      answerCount: number | null
      popupOpens: number | null
      popupOpenRate: number | null
      responseChanges: number | null
      backtracks: number | null
      medianDurationMs?: number | null
      likertDistribution: Array<{ value: number; label: string; count: number; rate: number }> | null
      freeTextResponses: Array<{ publicCode: string | null; value: string; warning: string | null }>
      freeTextAccess: 'granted' | 'forbidden' | 'not_applicable'
      highMedianDuration: boolean
      popupOftenOpened: boolean
      difficultQuestion: boolean
      difficultyLabels: string[]
      effectifSufficient: boolean
      displayValue: string
    }>
    submissions: Array<{
      publicCode: string
      building: string
      status: string
      startedAt: string | null
      submittedAt: string
      answerCount: number
      totalDurationMs: number | null
      telemetryEvents: number
      versionLabel: string
    }>
  }
}

export interface SubmissionDetailsResponse {
  submission: {
    publicCode: string
    status: string
    submittedAt: string
    startedAt: string | null
    totalDurationMs: number | null
    answerCount: number
    questionnaire: string
    versionLabel: string
    building: string
    answers: Array<{
      questionCode: string
      questionLabel: string
      responseType: QuestionType
      value: unknown
      warning: string | null
    }>
    telemetry: {
      totalEvents: number
      popupOpens: number
      answerChanges: number
      backtracks: number
      resumes: number
    }
  }
}

export interface IdentityVaultStatusResponse {
  status: {
    operationalSchema: string
    identitySchema: string
    identityTable: string
    model: string
    directEmailVisibleInAdmin: boolean
    currentRole: UserRole
    currentRoleCanExecuteEmailAccess: boolean
    accessMode: string
    audit: string[]
  }
}

export interface SecureDocumentDescriptor {
  id: string
  documentType: string
  storageRef: string
  algorithm: string
  keyRef: string
  fingerprint: string
  sizeBytes: number
  expiresAt: string
  status: string
  warning: string
}

export interface JudicialAccessRequestRecord {
  id: string
  requestReference: string
  legalBasisDescription: string
  courtOrderReference: string | null
  requestedPublicCodes: string[]
  requestedBy: string
  receivedAt: string
  dpoValidationUserId: string | null
  legalValidationUserId: string | null
  executedByUserId: string | null
  status: 'received' | 'validated' | 'rejected' | 'executed' | 'closed'
  dpoValidatedAt?: string | null
  legalValidatedAt?: string | null
  executedAt: string | null
  closedAt?: string | null
  exportFingerprint: string | null
  secureDocumentId?: string | null
  exportExpiresAt?: string | null
  exportSizeBytes?: number | null
  closureReport?: string | null
  comments: string | null
}

export interface JudicialAccessRequestsResponse {
  requests: JudicialAccessRequestRecord[]
}

export interface CreateJudicialAccessRequest {
  requestReference: string
  legalBasisDescription: string
  courtOrderReference?: string
  requestedPublicCodes: string[]
  requestedBy: string
  comments?: string
}

export interface JudicialAccessRequestResponse {
  judicialRequest: JudicialAccessRequestRecord
  secureDocument?: SecureDocumentDescriptor
}



export type NotificationFrequency = 'none' | 'immediate' | 'daily'
export type NotificationChannel = 'email' | 'internal' | 'simulation'
export type NotificationEventType =
  | 'submission_received'
  | 'difficult_question'
  | 'invitation_expired'
  | 'campaign_finished'
  | 'double_submission_attempt'
  | 'judicial_access_executed'

export interface ApiNotificationSubscription {
  id: string
  userId: string
  questionnaireVersionId: string | null
  buildingId: string | null
  eventType: NotificationEventType
  channel: NotificationChannel
  frequency: NotificationFrequency
  digestHour: number
  isEnabled: boolean
  lastDeliveredAt: string | null
  createdAt: string
  updatedAt: string
  questionnaireVersion?: {
    id: string
    versionLabel: string
    questionnaire: { id: string; title: string; code: string }
  } | null
}

export interface NotificationsResponse {
  subscriptions: ApiNotificationSubscription[]
}


export interface NotificationDigestRunResponse {
  result: {
    processedAt: string
    dueSubscriptionCount: number
    deliveredDigestCount: number
    dryRun: boolean
    delivered: Array<{
      subscriptionId: string
      recipientUserId: string
      queuedEventCount: number
      publicCodes: string[]
    }>
  }
}

export interface UpsertNotificationSubscriptionRequest {
  eventType: NotificationEventType
  channel?: NotificationChannel
  frequency?: NotificationFrequency
  digestHour?: number
  questionnaireVersionId?: string
  buildingId?: string
  isEnabled?: boolean
}

export interface TechnicalRegisterResponse {
  register: {
    generatedAt: string
    controller: string
    dpoContact: string
    consultedByRole: UserRole
    processing: Array<{
      name: string
      finality: string
      lawfulBasis: string
      dataCategories: string[]
      recipients: string[]
      storage: string
      retention?: string
    }>
    safeguards: string[]
    jobs?: string[]
  }
}

export interface RetentionPolicyResponse {
  policy: {
    generatedAt: string
    rules: Array<{ object: string; retention: string; action: string; endpoint: string }>
    parameters?: Record<string, number>
    knownLimitations: string[]
  }
}

export interface ComplianceMaintenanceResponse {
  result: {
    expiredCount?: number
    deletedDraftSessionCount?: number
    purgedTokenCount?: number
    purgedCount?: number
    deletedResponseSessionCount?: number
    purgedStorageRefs?: string[]
    cutoff?: string
    executedAt: string
  }
}

export interface PseudonymizedExportResponse {
  export: {
    generatedAt: string
    generatedByRole: UserRole
    questionnaire: { id: string; code: string; title: string }
    rowCount: number
    sourceRowCount?: number
    threshold?: number
    suppressedByThreshold?: boolean
    displayValue?: string
    containsDirectEmail: false
    containsEmailHash?: false
    containsEncryptedEmail?: false
    identityVaultExcluded: true
    fingerprint: string
    secureDocument?: SecureDocumentDescriptor
    rows: Array<{
      publicCode: string
      questionnaireId: string
      questionnaireCode: string
      versionId: string
      versionLabel: string
      buildingCode: string
      buildingLabel: string
      submittedAt: string
      answerCount: number
      telemetryEventCount: number
      answers: Array<{ questionCode: string; responseType: QuestionType; value: unknown; warning: string | null }>
    }>
  }
}

export interface AuditLogsResponse {
  logs: Array<{
    id: string
    actorUserId: string | null
    actorRole?: string | null
    action: string
    entityType: string
    entityId: string | null
    targetLabel?: string | null
    publicCode: string | null
    justification?: string | null
    correlationId?: string | null
    metadata: Record<string, unknown> | null
    ipAddress: string | null
    userAgent: string | null
    occurredAt: string
    actor?: { id: string; displayName: string; email: string; role: UserRole } | null
  }>
}
