import type {
  AssistanceMode,
  BuildingScope,
  InvitationDeliveryMode,
  InvitationStatus,
  LanguageCode,
  QuestionDefinition,
  QuestionType,
  SubmissionStatus,
  TerminalDeviceStatus,
} from './domain'
import type { Permission, UserRole } from './rbac'

export interface ApiBuilding extends BuildingScope {
  code: string
  timezone: string
  siteId?: string
  organizationId?: string
}

export interface ApiSite {
  id: string
  code: string
  name: string
  organizationId: string
  organization: { id: string; code: string; name: string } | null
  country?: string | null
  timezone?: string | null
}

export interface CreateSiteRequest {
  code: string
  name: string
  country?: string
  timezone?: string
}

export interface SiteMutationResponse {
  site: ApiSite
}

export interface CreateBuildingRequest {
  code: string
  label: string
  city: string
  country: string
  timezone: string
}

export interface BuildingMutationResponse {
  building: ApiBuilding
}

export interface AuthUserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  permissions: Permission[]
  mustChangePassword?: boolean
  building: ApiBuilding | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface AuthResponse {
  user: AuthUserProfile
}

export type ProjectHierarchyScope = 'project' | 'site' | 'self'

export type ProjectHierarchyNodeKind =
  | 'project'
  | 'project_admin'
  | 'site'
  | 'site_manager'
  | 'moderator'
  | 'team'

export interface ProjectHierarchyNode {
  id: string
  kind: ProjectHierarchyNodeKind
  label: string
  subtitle: string | null
  role: Extract<UserRole, 'admin' | 'site_manager' | 'moderator'> | null
  isActive: boolean | null
  isCurrentUser: boolean
  children: ProjectHierarchyNode[]
}

export interface ProjectHierarchyResponse {
  hierarchy: ProjectHierarchyNode
  scope: ProjectHierarchyScope
  generatedAt: string
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
    scope: 'site' | 'project'
    passwordReturnedOnce: boolean
  }
}

export interface SitesResponse {
  sites: ApiSite[]
}

export interface SiteAdminsResponse {
  users: ApiSiteAdminUser[]
  policy: {
    manageableRoles: Array<Extract<UserRole, 'site_manager'>>
    scope: 'project'
    passwordReturnedOnce: boolean
    forbiddenRoles: UserRole[]
  }
}

export type ApiSiteAdminUser = ApiSiteTeamUser & {
  role: Extract<UserRole, 'site_manager'>
}

export interface CreateSiteAdminRequest {
  email: string
  displayName: string
  siteId: string
  temporaryPassword?: string
}

export interface SiteAdminMutationResponse {
  user: ApiSiteAdminUser
  temporaryPassword?: string
  temporaryPasswordGenerated?: boolean
}

export interface UpdateSiteAdminRequest {
  displayName?: string
  siteId?: string
  isActive?: boolean
}

export interface RevokeSessionsResponse {
  user: ApiSiteTeamUser
  revokedSessionCount: number
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
  operator?:
    | 'answered'
    | 'not_answered'
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
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

export interface AddQuestionnaireLanguageRequest {
  language: LanguageCode
  title?: string
  description?: string
  finality?: string
}

export interface AddQuestionnaireLanguageResponse {
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
  responseType: Extract<
    QuestionType,
    | 'free_text'
    | 'free_text_short'
    | 'free_text_long'
    | 'likert'
    | 'single_choice'
    | 'multiple_choice'
    | 'number'
    | 'date'
    | 'information'
  >
  isRequired?: boolean
  displayOrder?: number
  conditionExpression?: ConditionExpression | null
  likertScale?: LikertScaleRequest
  answerOptions?: Array<{
    value: string
    label: string
    displayOrder?: number
    isExclusive?: boolean
  }>
  popupDefinition?: PopupDefinitionRequest
}

export interface UpdateQuestionRequest {
  code?: string
  label?: string
  helperText?: string
  responseType?: Extract<
    QuestionType,
    | 'free_text'
    | 'free_text_short'
    | 'free_text_long'
    | 'likert'
    | 'single_choice'
    | 'multiple_choice'
    | 'number'
    | 'date'
    | 'information'
  >
  isRequired?: boolean
  displayOrder?: number
  conditionExpression?: ConditionExpression | null
  likertScale?: LikertScaleRequest
  answerOptions?: Array<{
    value: string
    label: string
    displayOrder?: number
    isExclusive?: boolean
  }>
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
  maskedPhone: string | null
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
  phone?: string
  deliveryMode?: InvitationDeliveryMode
  terminalDeviceId?: string
  refusalReason?: string
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

export interface SubmitPaperResponsesRequest {
  answers: Array<{ questionId: string; value: unknown }>
  moderatorNote?: string
}

export interface SubmitPaperResponsesResponse {
  invitation: ApiInvitation
  submission: {
    id: string
    publicCode: string
    submittedAt: string
    answerCount: number
  }
  warnings: Array<{ questionId: string; reason: string | null }>
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
      invited: number | null
      opened: number | null
      started: number | null
      submitted: number | null
      abandoned: number | null
      expired: number | null
      openingRate: number | null
      startRate: number | null
      submissionRate: number | null
      completionRate: number | null
      abandonmentRate: number | null
      telemetryEvents: number | null
      popupOpens: number | null
      answerChanges: number | null
      backtracks: number | null
      resumes: number | null
      medianTotalDurationMs: number | null
      effectifSufficient: boolean
    }
    fieldTracking: {
      approached: number | null
      invited: number | null
      refused: number | null
      refusalRate: number | null
      noDigitalContact: number | null
      noDigitalContactRate: number | null
      onsiteTerminal: number | null
      paperForms: number | null
      digitalContact: number | null
      pendingWithoutDigitalContact: number | null
      effectifSufficient: boolean
      displayValue: string
    }
    versions: Array<{
      id: string
      versionLabel: string
      status: string
      invited: number | null
      opened: number | null
      started: number | null
      submitted: number | null
      abandoned: number | null
      openingRate: number | null
      startRate: number | null
      submissionRate: number | null
      completionRate: number | null
      abandonmentRate: number | null
      effectifSufficient: boolean
      displayValue: string
    }>
    deliveryModes: Array<{
      mode: InvitationDeliveryMode
      label: string
      invited: number | null
      opened: number | null
      started: number | null
      submitted: number | null
      openingRate: number | null
      startRate: number | null
      submissionRate: number | null
      effectifSufficient: boolean
      displayValue: string
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
      invited: number | null
      opened: number | null
      started: number | null
      submitted: number | null
      openingRate: number | null
      startRate: number | null
      submissionRate: number | null
      effectifSufficient: boolean
      displayValue: string
    }>
    languages?: Array<{
      language: string
      versionCount: number
      invited: number | null
      submitted: number | null
      submissionRate: number | null
      effectifSufficient: boolean
      displayValue: string
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
      likertDistribution: Array<{
        value: number
        label: string
        count: number
        rate: number
      }> | null
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
    directPhoneVisibleInAdmin?: boolean
    currentRole: UserRole
    currentRoleCanExecuteEmailAccess: boolean
    currentRoleCanExecuteIdentityAccess?: boolean
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

export interface JudicialEncryptedEnvelope {
  algorithm: 'aes-256-gcm'
  keyRef: string
  iv: string
  authTag: string
  ciphertext: string
}

export interface JudicialEncryptedExport {
  fingerprint: string
  expiresAt: string
  rowCount: number
  envelope: JudicialEncryptedEnvelope
}

export interface JudicialAccessRequestResponse {
  judicialRequest: JudicialAccessRequestRecord
  export?: JudicialEncryptedExport
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
    skipped?: boolean
    reason?: string
    expiredCount?: number
    expiredInvitationCount?: number
    deletedDraftSessionCount?: number
    deletedSubmittedSessionCount?: number
    deletedAuditCount?: number
    expiredExportCount?: number
    anonymizedIdentityCount?: number
    deletedDeliveryEventCount?: number
    deletedDeliveryJobCount?: number
    deletedIdentityAuditCount?: number
    purgedTokenCount?: number
    purgedCount?: number
    deletedResponseSessionCount?: number
    purgedStorageRefs?: string[]
    cutoff?: string
    executedAt?: string
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
      answers: Array<{
        questionCode: string
        responseType: QuestionType
        value: unknown
        warning: string | null
      }>
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
