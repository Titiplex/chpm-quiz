import { roleProfiles, type UserRole } from '@shared/types/rbac'
import type { InvitationStatus, QuestionType, SubmissionStatus } from '@shared/types/domain'
import type {
  ApiAnswerOption,
  ApiBuilding,
  ApiInvitation,
  ApiLikertScale,
  ApiPopupDefinition,
  ApiQuestion,
  ApiQuestionnaire,
  ApiNotificationSubscription,
  AuthResponse,
  AuthUserProfile,
  BuildingsResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  AuditLogsResponse,
  ComplianceMaintenanceResponse,
  CreateJudicialAccessRequest,
  CreateQuestionGroupRequest,
  CreateQuestionnaireRequest,
  CreateQuestionRequest,
  IdentityVaultStatusResponse,
  NotificationsResponse,
  NotificationDigestRunResponse,
  PseudonymizedExportResponse,
  RetentionPolicyResponse,
  InvitationsResponse,
  JudicialAccessRequestRecord,
  JudicialAccessRequestResponse,
  JudicialAccessRequestsResponse,
  QuestionnaireResponse,
  QuestionnairesResponse,
  RespondentAnswer,
  RespondentQuestion,
  RespondentSessionResponse,
  SaveAnswersRequest,
  SaveAnswersResponse,
  StatsResponse,
  SubmissionDetailsResponse,
  SubmitResponse,
  UpdateQuestionGroupRequest,
  UpdateQuestionnaireRequest,
  TechnicalRegisterResponse,
  UpdateQuestionRequest,
  UpsertNotificationSubscriptionRequest,
} from '@shared/types/api'

interface DemoRequestOptions {
  body?: object | Array<unknown>
}

const SESSION_EMAIL_STORAGE_KEY = 'chpm_demo_session_email'
const QUESTIONNAIRES_STORAGE_KEY = 'chpm_demo_questionnaires'
const INVITATIONS_STORAGE_KEY = 'chpm_demo_invitations'
const RESPONDENT_SESSIONS_STORAGE_KEY = 'chpm_demo_respondent_sessions'
const JUDICIAL_REQUESTS_STORAGE_KEY = 'chpm_demo_judicial_requests'
const NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY = 'chpm_demo_notification_subscriptions'
const AUDIT_LOGS_STORAGE_KEY = 'chpm_demo_audit_logs'

interface DemoUserSeed {
  email: string
  password: string
  displayName: string
  role: Exclude<UserRole, 'respondent' | 'service_account'>
  buildingId?: string
}

type RespondentSessionMap = Record<string, RespondentSessionResponse>

type JsonRecord = Record<string, unknown>

const DEMO_ORGANIZATION_ID = 'demo-org-chpm'
const CHPM_VERSION_ID = 'demo-version-chpm-1-4'
const ITQ_VERSION_ID = 'demo-version-itq-1-0-cn2r'
const CHPM_TOKEN = 'demo-chpm-open'
const ITQ_TOKEN = 'demo-itq-open'

const buildingSeeds: ApiBuilding[] = [
  {
    id: 'demo-building-mtl-a',
    code: 'MTL-A',
    label: 'Montréal · Bâtiment A',
    country: 'Canada',
    city: 'Montréal',
    timezone: 'America/Montreal',
    organizationId: DEMO_ORGANIZATION_ID,
    siteId: 'demo-site-mtl',
  },
  {
    id: 'demo-building-par-c',
    code: 'PAR-C',
    label: 'Paris · Bâtiment C',
    country: 'France',
    city: 'Paris',
    timezone: 'Europe/Paris',
    organizationId: DEMO_ORGANIZATION_ID,
    siteId: 'demo-site-par',
  },
  {
    id: 'demo-building-tyo-h',
    code: 'TYO-H',
    label: 'Tokyo · Bâtiment H',
    country: 'Japon',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
    organizationId: DEMO_ORGANIZATION_ID,
    siteId: 'demo-site-tyo',
  },
]

const demoUsers: DemoUserSeed[] = [
  {
    email: 'admin@chpm.local',
    password: 'Admin123!',
    displayName: 'Alice Martin',
    role: 'admin',
  },
  {
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    displayName: 'Marc Dubois',
    role: 'moderator',
    buildingId: 'demo-building-mtl-a',
  },
  {
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    displayName: 'Nadia Bernard',
    role: 'analyst',
  },
  {
    email: 'dpo@chpm.local',
    password: 'Dpo12345!',
    displayName: 'Claire DPO',
    role: 'dpo',
  },
  {
    email: 'judiciaire@chpm.local',
    password: 'Judiciaire123!',
    displayName: 'Julie Accès judiciaire',
    role: 'judicial_officer',
  },
  {
    email: 'tech@chpm.local',
    password: 'Tech12345!',
    displayName: 'Thomas Exploitation',
    role: 'technical_admin',
  },
]

export async function demoApiRequest<T>(path: string, options: DemoRequestOptions = {}): Promise<T> {
  await waitForDemoLatency()

  const requestUrl = new URL(path, 'https://demo.chpm.local')
  const method = (options as RequestInit).method?.toUpperCase() ?? 'GET'
  const route = requestUrl.pathname.replace(/\/$/, '') || '/'

  if (method === 'GET' && route === '/me') {
    return asResponse<T>(getCurrentAuthResponse())
  }

  if (method === 'POST' && route === '/auth/login') {
    return asResponse<T>(login(options.body as { email?: string; password?: string }))
  }

  if (method === 'POST' && route === '/auth/logout') {
    window.localStorage.removeItem(SESSION_EMAIL_STORAGE_KEY)
    return undefined as T
  }

  if (method === 'GET' && route === '/buildings') {
    return asResponse<T>({ buildings: getVisibleBuildings() } satisfies BuildingsResponse)
  }

  if (method === 'GET' && route === '/questionnaires') {
    return asResponse<T>({ questionnaires: getVisibleQuestionnaires() } satisfies QuestionnairesResponse)
  }

  if (method === 'POST' && route === '/questionnaires') {
    return asResponse<T>(createQuestionnaire(options.body as CreateQuestionnaireRequest))
  }

  const questionnaireMatch = route.match(/^\/questionnaires\/([^/]+)$/)
  if (questionnaireMatch?.[1] && method === 'PATCH') {
    return asResponse<T>(updateQuestionnaire(questionnaireMatch[1], options.body as UpdateQuestionnaireRequest))
  }

  const groupsMatch = route.match(/^\/questionnaires\/([^/]+)\/groups$/)
  if (groupsMatch?.[1] && method === 'POST') {
    return asResponse<T>(createGroup(groupsMatch[1], options.body as CreateQuestionGroupRequest))
  }

  const groupMatch = route.match(/^\/questionnaires\/([^/]+)\/groups\/([^/]+)$/)
  if (groupMatch?.[1] && groupMatch[2] && method === 'PATCH') {
    return asResponse<T>(updateGroup(groupMatch[1], groupMatch[2], options.body as UpdateQuestionGroupRequest))
  }
  if (groupMatch?.[1] && groupMatch[2] && method === 'DELETE') {
    return asResponse<T>(archiveGroup(groupMatch[1], groupMatch[2]))
  }

  const groupQuestionMatch = route.match(/^\/questionnaires\/([^/]+)\/groups\/([^/]+)\/questions$/)
  if (groupQuestionMatch?.[1] && groupQuestionMatch[2] && method === 'POST') {
    return asResponse<T>(createQuestion(groupQuestionMatch[1], groupQuestionMatch[2], options.body as CreateQuestionRequest))
  }

  const questionMatch = route.match(/^\/questionnaires\/([^/]+)\/questions\/([^/]+)$/)
  if (questionMatch?.[1] && questionMatch[2] && method === 'PATCH') {
    return asResponse<T>(updateQuestion(questionMatch[1], questionMatch[2], options.body as UpdateQuestionRequest))
  }
  if (questionMatch?.[1] && questionMatch[2] && method === 'DELETE') {
    return asResponse<T>(archiveQuestion(questionMatch[1], questionMatch[2]))
  }

  if (method === 'GET' && route === '/moderation/invitations') {
    return asResponse<T>({ invitations: getInvitations() } satisfies InvitationsResponse)
  }

  if (method === 'POST' && route === '/moderation/invitations') {
    return asResponse<T>(createInvitation(options.body as CreateInvitationRequest))
  }

  const resendMatch = route.match(/^\/moderation\/invitations\/([^/]+)\/resend$/)
  if (resendMatch?.[1] && method === 'POST') {
    return asResponse<T>(resendInvitation(resendMatch[1]))
  }

  if (method === 'GET' && route === '/respondent/session') {
    return asResponse<T>(getRespondentSession(requestUrl.searchParams.get('token') ?? ''))
  }

  if (method === 'PUT' && route === '/respondent/answers') {
    return asResponse<T>(saveRespondentAnswers(options.body as SaveAnswersRequest))
  }

  if (method === 'POST' && route === '/respondent/telemetry') {
    return asResponse<T>({ ok: true })
  }

  if (method === 'POST' && route === '/respondent/submit') {
    return asResponse<T>(submitRespondentSession(options.body as { token?: string }))
  }



  if (method === 'GET' && route === '/notifications/subscriptions') {
    return asResponse<T>({ subscriptions: getNotificationSubscriptions() } satisfies NotificationsResponse)
  }

  if (method === 'POST' && route === '/notifications/subscriptions') {
    return asResponse<T>({ subscription: upsertNotificationSubscription(options.body as UpsertNotificationSubscriptionRequest) })
  }

  if (method === 'POST' && route === '/notifications/daily-digests/run') {
    return asResponse<T>(runDemoDailyDigests() satisfies NotificationDigestRunResponse)
  }

  if (method === 'GET' && route === '/compliance/technical-register') {
    return asResponse<T>(getTechnicalRegister())
  }

  if (method === 'GET' && route === '/compliance/retention-policy') {
    return asResponse<T>(getRetentionPolicy())
  }

  if (method === 'POST' && route === '/compliance/maintenance/expire-invitations') {
    return asResponse<T>(expireDemoInvitations())
  }

  if (method === 'POST' && route === '/compliance/maintenance/cleanup-drafts') {
    return asResponse<T>(cleanupDemoDrafts())
  }

  if (method === 'GET' && route === '/compliance/exports/pseudonymized') {
    return asResponse<T>(getPseudonymizedExport(requestUrl.searchParams.get('questionnaireId') ?? undefined))
  }

  if (method === 'GET' && route === '/audit-logs') {
    return asResponse<T>({ logs: getAuditLogs(Number(requestUrl.searchParams.get('limit') ?? 30)) } satisfies AuditLogsResponse)
  }

  const statsMatch = route.match(/^\/stats\/questionnaires\/([^/]+)$/)
  if (statsMatch?.[1] && method === 'GET') {
    return asResponse<T>({ stats: createStats(statsMatch[1]) } satisfies StatsResponse)
  }

  const submissionMatch = route.match(/^\/stats\/submissions\/([^/]+)$/)
  if (submissionMatch?.[1] && method === 'GET') {
    return asResponse<T>(getSubmissionDetails(decodeURIComponent(submissionMatch[1])))
  }

  if (method === 'GET' && route === '/identity-vault/status') {
    return asResponse<T>(getIdentityVaultStatus())
  }

  if (method === 'POST' && route === '/identity-vault/access-attempt') {
    return asResponse<T>(recordIdentityVaultAccessAttempt(options.body as { publicCode?: string; justification?: string }))
  }

  if (method === 'GET' && route === '/judicial-access/requests') {
    return asResponse<T>({ requests: getJudicialRequests() } satisfies JudicialAccessRequestsResponse)
  }

  if (method === 'POST' && route === '/judicial-access/requests') {
    return asResponse<T>(createJudicialRequest(options.body as CreateJudicialAccessRequest))
  }

  const judicialWorkflowMatch = route.match(/^\/judicial-access\/requests\/([^/]+)\/(validate-dpo|validate-legal|execute|close|reject)$/)
  if (judicialWorkflowMatch?.[1] && judicialWorkflowMatch[2] && method === 'POST') {
    return asResponse<T>(updateJudicialRequest(judicialWorkflowMatch[1], judicialWorkflowMatch[2]))
  }

  throw new Error(`Route de démonstration non simulée : ${method} ${route}`)
}

function waitForDemoLatency(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 80))
}

function asResponse<T>(payload: unknown): T {
  return clone(payload) as T
}

function getCurrentAuthResponse(): AuthResponse {
  const email = window.localStorage.getItem(SESSION_EMAIL_STORAGE_KEY)
  const user = demoUsers.find((candidate) => candidate.email === email)

  if (!user) {
    throw new Error('Session de démonstration absente.')
  }

  return { user: toAuthUserProfile(user) }
}

function login(credentials: { email?: string; password?: string }): AuthResponse {
  const email = credentials.email?.trim().toLowerCase() ?? ''
  const user = demoUsers.find((candidate) => candidate.email === email && candidate.password === credentials.password)

  if (!user) {
    throw new Error('Identifiants de démonstration invalides.')
  }

  window.localStorage.setItem(SESSION_EMAIL_STORAGE_KEY, user.email)
  return { user: toAuthUserProfile(user) }
}

function toAuthUserProfile(seed: DemoUserSeed): AuthUserProfile {
  const building = seed.buildingId ? buildingSeeds.find((candidate) => candidate.id === seed.buildingId) ?? null : null

  return {
    id: `demo-user-${seed.role}`,
    email: seed.email,
    displayName: seed.displayName,
    role: seed.role,
    permissions: roleProfiles[seed.role].permissions,
    building,
  }
}

function getVisibleBuildings(): ApiBuilding[] {
  const currentUser = safeCurrentUser()

  if (currentUser?.role === 'moderator' && currentUser.buildingId) {
    return buildingSeeds.filter((building) => building.id === currentUser.buildingId)
  }

  return buildingSeeds
}

function getVisibleQuestionnaires(): ApiQuestionnaire[] {
  const currentUser = safeCurrentUser()
  const questionnaires = getQuestionnaires()

  if (currentUser && !['admin', 'questionnaire_admin'].includes(currentUser.role)) {
    return questionnaires.filter((questionnaire) => questionnaire.isPublished)
  }

  return questionnaires
}

function safeCurrentUser(): DemoUserSeed | null {
  const email = window.localStorage.getItem(SESSION_EMAIL_STORAGE_KEY)
  return demoUsers.find((candidate) => candidate.email === email) ?? null
}

function getQuestionnaires(): ApiQuestionnaire[] {
  return readStorage(QUESTIONNAIRES_STORAGE_KEY, createInitialQuestionnaires)
}

function saveQuestionnaires(questionnaires: ApiQuestionnaire[]): void {
  window.localStorage.setItem(QUESTIONNAIRES_STORAGE_KEY, JSON.stringify(questionnaires))
}

function getInvitations(): ApiInvitation[] {
  return readStorage(INVITATIONS_STORAGE_KEY, createInitialInvitations)
}

function saveInvitations(invitations: ApiInvitation[]): void {
  window.localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations))
}

function getRespondentSessions(): RespondentSessionMap {
  return readStorage(RESPONDENT_SESSIONS_STORAGE_KEY, createInitialRespondentSessions)
}

function saveRespondentSessions(sessions: RespondentSessionMap): void {
  window.localStorage.setItem(RESPONDENT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
}

function readStorage<T>(key: string, fallback: () => T): T {
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    const initialValue = fallback()
    window.localStorage.setItem(key, JSON.stringify(initialValue))
    return clone(initialValue)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    const initialValue = fallback()
    window.localStorage.setItem(key, JSON.stringify(initialValue))
    return clone(initialValue)
  }
}

function createQuestionnaire(payload: CreateQuestionnaireRequest): QuestionnaireResponse {
  const questionnaires = getQuestionnaires()
  const id = createId('questionnaire')
  const versionId = createId('version')
  const created: ApiQuestionnaire = {
    id,
    code: normalizeCode(payload.code || `QUEST-${questionnaires.length + 1}`),
    title: payload.title || 'Nouveau questionnaire',
    description: payload.description ?? null,
    defaultLanguage: payload.defaultLanguage ?? 'fr',
    versionId,
    version: '0.1',
    versionLabel: '0.1-draft',
    language: payload.defaultLanguage ?? 'fr',
    finality: payload.finality ?? null,
    status: 'draft',
    isPublished: false,
    groupCount: 0,
    questionCount: 0,
    groups: [],
  }

  questionnaires.unshift(created)
  saveQuestionnaires(questionnaires)
  return { questionnaire: created }
}

function updateQuestionnaire(questionnaireId: string, payload: UpdateQuestionnaireRequest): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    questionnaire.title = payload.title ?? questionnaire.title
    questionnaire.description = payload.description ?? questionnaire.description
    questionnaire.defaultLanguage = payload.defaultLanguage ?? questionnaire.defaultLanguage
    questionnaire.language = payload.defaultLanguage ?? questionnaire.language
    questionnaire.finality = payload.finality ?? questionnaire.finality
  })
}

function createGroup(questionnaireId: string, payload: CreateQuestionGroupRequest): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    questionnaire.groups.push({
      id: createId('group'),
      title: payload.title || 'Nouveau groupe',
      description: payload.description ?? null,
      displayOrder: payload.displayOrder ?? questionnaire.groups.length + 1,
      questionsPerPage: payload.questionsPerPage ?? 1,
      randomize: payload.randomize ?? false,
      conditionExpression: payload.conditionExpression ?? null,
      questions: [],
    })
  })
}

function updateGroup(questionnaireId: string, groupId: string, payload: UpdateQuestionGroupRequest): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    const group = findGroup(questionnaire, groupId)
    group.title = payload.title ?? group.title
    group.description = payload.description ?? group.description
    group.displayOrder = payload.displayOrder ?? group.displayOrder
    group.questionsPerPage = payload.questionsPerPage ?? group.questionsPerPage
    group.randomize = payload.randomize ?? group.randomize
    group.conditionExpression = payload.conditionExpression ?? group.conditionExpression
  })
}

function archiveGroup(questionnaireId: string, groupId: string): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    questionnaire.groups = questionnaire.groups.filter((group) => group.id !== groupId)
  })
}

function createQuestion(questionnaireId: string, groupId: string, payload: CreateQuestionRequest): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    const group = findGroup(questionnaire, groupId)
    group.questions.push(toApiQuestion(payload, group.questions.length + 1))
  })
}

function updateQuestion(questionnaireId: string, questionId: string, payload: UpdateQuestionRequest): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    const question = questionnaire.groups.flatMap((group) => group.questions).find((candidate) => candidate.id === questionId)
    if (!question) throw new Error('Question introuvable dans la démo.')

    question.code = payload.code ?? question.code
    question.label = payload.label ?? question.label
    question.title = payload.label ?? question.title
    question.helperText = payload.helperText ?? question.helperText
    question.responseType = payload.responseType ?? question.responseType
    question.type = payload.responseType ?? question.type
    question.isRequired = payload.isRequired ?? question.isRequired
    question.displayOrder = payload.displayOrder ?? question.displayOrder
    question.conditionExpression = payload.conditionExpression ?? question.conditionExpression
    question.likertScale = payload.likertScale ? createLikertScale(payload.likertScale) : question.likertScale
    question.options = payload.answerOptions?.map((option, index) => ({
      id: createId('option'),
      value: option.value,
      label: option.label,
      displayOrder: option.displayOrder ?? index + 1,
    })) ?? question.options
    question.popupDefinitions = payload.popupDefinition
      ? [createPopupDefinition(payload.popupDefinition.title, payload.popupDefinition.body)]
      : payload.popupDefinition === null
        ? []
        : question.popupDefinitions
  })
}

function archiveQuestion(questionnaireId: string, questionId: string): QuestionnaireResponse {
  return mutateQuestionnaire(questionnaireId, (questionnaire) => {
    questionnaire.groups = questionnaire.groups.map((group) => ({
      ...group,
      questions: group.questions.filter((question) => question.id !== questionId),
    }))
  })
}

function mutateQuestionnaire(questionnaireId: string, mutation: (questionnaire: ApiQuestionnaire) => void): QuestionnaireResponse {
  const questionnaires = getQuestionnaires()
  const questionnaire = questionnaires.find((candidate) => candidate.id === questionnaireId)

  if (!questionnaire) {
    throw new Error('Questionnaire introuvable dans la démo.')
  }

  mutation(questionnaire)
  recomputeQuestionnaireCounters(questionnaire)
  saveQuestionnaires(questionnaires)
  return { questionnaire }
}

function findGroup(questionnaire: ApiQuestionnaire, groupId: string) {
  const group = questionnaire.groups.find((candidate) => candidate.id === groupId)
  if (!group) throw new Error('Groupe introuvable dans la démo.')
  return group
}

function recomputeQuestionnaireCounters(questionnaire: ApiQuestionnaire): void {
  questionnaire.groups.sort((left, right) => left.displayOrder - right.displayOrder)
  questionnaire.groupCount = questionnaire.groups.length
  questionnaire.questionCount = questionnaire.groups.reduce((total, group) => total + group.questions.length, 0)
}

function toApiQuestion(payload: CreateQuestionRequest | UpdateQuestionRequest, fallbackOrder: number): ApiQuestion {
  const responseType = payload.responseType ?? 'free_text_long'
  const label = payload.label ?? 'Nouvelle question'

  return {
    id: createId('question'),
    code: normalizeCode(payload.code ?? `Q-${fallbackOrder}`),
    title: label,
    label,
    type: responseType,
    responseType,
    displayOrder: payload.displayOrder ?? fallbackOrder,
    isRequired: payload.isRequired ?? false,
    helperText: payload.helperText ?? null,
    answerScaleLabel: responseType === 'likert' ? 'Échelle de Likert' : 'Réponse',
    conditionExpression: payload.conditionExpression ?? null,
    likertScale: payload.likertScale ? createLikertScale(payload.likertScale) : null,
    options: payload.answerOptions?.map((option, index) => ({
      id: createId('option'),
      value: option.value,
      label: option.label,
      displayOrder: option.displayOrder ?? index + 1,
    })) ?? [],
    popupDefinitions: payload.popupDefinition ? [createPopupDefinition(payload.popupDefinition.title, payload.popupDefinition.body)] : [],
  }
}

function createInvitation(payload: CreateInvitationRequest): CreateInvitationResponse {
  const questionnaires = getQuestionnaires()
  const questionnaire = questionnaires.find((candidate) => candidate.versionId === payload.questionnaireVersionId)
  const building = buildingSeeds.find((candidate) => candidate.id === payload.buildingId)

  if (!questionnaire || !building) {
    throw new Error('Questionnaire ou bâtiment de démonstration introuvable.')
  }

  const invitations = getInvitations()
  const publicCode = `DEMO-${String(invitations.length + 1).padStart(4, '0')}`
  const token = `demo-${publicCode.toLowerCase()}-${crypto.randomUUID()}`
  const invitation: ApiInvitation = {
    id: createId('invitation'),
    publicCode,
    status: 'sent',
    maskedEmail: maskEmail(payload.email),
    questionnaireVersionId: payload.questionnaireVersionId,
    questionnaireTitle: questionnaire.title,
    versionLabel: questionnaire.versionLabel,
    building,
    expiresAt: addDaysIso(30),
    sentAt: nowIso(),
    openedAt: null,
    startedAt: null,
    submittedAt: null,
    responseStatus: null,
  }

  invitations.unshift(invitation)
  saveInvitations(invitations)

  const sessions = getRespondentSessions()
  sessions[token] = createRespondentSession(token, questionnaire, building, publicCode, 'draft')
  saveRespondentSessions(sessions)

  return {
    invitation,
    accessToken: token,
    devAccessLink: createRespondentLink(token),
  }
}

function resendInvitation(invitationId: string): { invitation: ApiInvitation } {
  const invitations = getInvitations()
  const invitation = invitations.find((candidate) => candidate.id === invitationId)

  if (!invitation) {
    throw new Error('Invitation introuvable dans la démo.')
  }

  invitation.sentAt = nowIso()
  invitation.status = invitation.status === 'pending' ? 'sent' : invitation.status
  saveInvitations(invitations)
  return { invitation }
}

function getRespondentSession(token: string): RespondentSessionResponse {
  const sessions = getRespondentSessions()
  const session = sessions[token]

  if (!session) {
    throw new Error('Lien répondant invalide ou expiré dans la démo.')
  }

  if (session.invitation.status === 'sent') {
    session.invitation.status = 'opened'
    const invitations = getInvitations().map((invitation) =>
      invitation.publicCode === session.responseSession.publicCode
        ? { ...invitation, status: 'opened' as InvitationStatus, openedAt: nowIso(), responseStatus: 'draft' as SubmissionStatus }
        : invitation,
    )
    saveInvitations(invitations)
    saveRespondentSessions(sessions)
  }

  return session
}

function saveRespondentAnswers(payload: SaveAnswersRequest): SaveAnswersResponse {
  const token = payload.token
  const sessions = getRespondentSessions()
  const session = sessions[token]

  if (!session || session.responseSession.status === 'locked') {
    throw new Error('Session répondant verrouillée ou introuvable.')
  }

  const savedAnswers: RespondentAnswer[] = []
  const warnings: Array<{ questionId: string; reason: string | null }> = []

  for (const answerInput of payload.answers) {
    const question = findRespondentQuestion(session, answerInput.questionId)
    const answer: RespondentAnswer = {
      id: createId('answer'),
      questionId: answerInput.questionId,
      value: answerInput.value,
      identifiabilityWarning: isPotentiallyIdentifying(answerInput.value),
      warningReason: isPotentiallyIdentifying(answerInput.value)
        ? 'Le champ semble contenir une information potentiellement identifiante.'
        : null,
    }

    question.answer = answer
    savedAnswers.push(answer)

    if (answer.identifiabilityWarning) {
      warnings.push({ questionId: answer.questionId, reason: answer.warningReason ?? null })
    }
  }

  session.responseSession.status = 'draft'
  const invitations = getInvitations().map((invitation) =>
    invitation.publicCode === session.responseSession.publicCode
      ? {
          ...invitation,
          status: 'in_progress' as InvitationStatus,
          startedAt: invitation.startedAt ?? nowIso(),
          responseStatus: 'draft' as SubmissionStatus,
        }
      : invitation,
  )

  saveInvitations(invitations)
  saveRespondentSessions(sessions)
  return { savedAnswers, warnings }
}

function submitRespondentSession(payload: { token?: string }): SubmitResponse {
  const token = payload.token ?? ''
  const sessions = getRespondentSessions()
  const session = sessions[token]

  if (!session) {
    throw new Error('Session répondant introuvable dans la démo.')
  }

  const submittedAt = nowIso()
  session.responseSession.status = 'locked'
  session.responseSession.submittedAt = submittedAt
  session.responseSession.lockedAt = submittedAt
  session.invitation.status = 'submitted'

  const answerCount = session.questionnaire.groups.reduce(
    (total, group) => total + group.questions.filter((question) => question.answer).length,
    0,
  )

  const invitations = getInvitations().map((invitation) =>
    invitation.publicCode === session.responseSession.publicCode
      ? {
          ...invitation,
          status: 'submitted' as InvitationStatus,
          submittedAt,
          responseStatus: 'locked' as SubmissionStatus,
        }
      : invitation,
  )

  saveInvitations(invitations)
  saveRespondentSessions(sessions)
  appendAuditLog('response.submitted', 'RespondentSession', session.responseSession.id, session.responseSession.publicCode, {
    questionnaireVersionId: session.questionnaire.versionId,
    questionnaireTitle: session.questionnaire.title,
    answerCount,
    directEmailVisible: false,
    simulation: true,
  })
  notifyDemoSubmission(session, answerCount, submittedAt)

  return {
    submission: {
      id: createId('submission'),
      publicCode: session.responseSession.publicCode,
      submittedAt,
      answerCount,
    },
  }
}

function findRespondentQuestion(session: RespondentSessionResponse, questionId: string): RespondentQuestion {
  const question = session.questionnaire.groups.flatMap((group) => group.questions).find((candidate) => candidate.id === questionId)
  if (!question) throw new Error('Question répondant introuvable.')
  return question
}

function createInitialQuestionnaires(): ApiQuestionnaire[] {
  return [createItqQuestionnaire(), createChpmQuestionnaire(), createPilotQuestionnaire()]
}

function createChpmQuestionnaire(): ApiQuestionnaire {
  const questionnaire: ApiQuestionnaire = {
    id: 'demo-questionnaire-chpm-base',
    code: 'CHPM-BASE',
    title: 'Questionnaire CHPM',
    description: 'Questionnaire adaptatif de compréhension et de retour d’expérience.',
    defaultLanguage: 'fr',
    versionId: CHPM_VERSION_ID,
    version: '1.4',
    versionLabel: '1.4',
    language: 'fr',
    finality: 'Mesurer la compréhension des formulations métier et identifier les zones d’ambiguïté.',
    status: 'published',
    isPublished: true,
    openFrom: addDaysIso(-7),
    openUntil: addDaysIso(45),
    groupCount: 0,
    questionCount: 0,
    groups: [
      {
        id: 'demo-group-chpm-accueil',
        title: 'Accueil',
        description: 'Consentement, langue et contexte de passation.',
        displayOrder: 1,
        questionsPerPage: 2,
        randomize: false,
        questions: [
          question('demo-q-q001', 'Q-001', 1, 'Langue de passation souhaitée / Preferred language', 'single_choice', {
            required: true,
            helperText: 'Votre choix pilote automatiquement les groupes de questions affichés ensuite.',
            options: [
              ['fr', 'Français'],
              ['en', 'English'],
            ],
          }),
          question('demo-q-q002', 'Q-002', 2, 'Confirmez-vous pouvoir répondre maintenant ?', 'single_choice', {
            required: true,
            helperText: 'Permet de reporter la passation si nécessaire.',
            options: [
              ['yes', 'Oui'],
              ['no', 'Non'],
            ],
          }),
        ],
      },
      {
        id: 'demo-group-chpm-fr',
        title: 'Questions françaises',
        description: 'Groupe conditionnel affiché uniquement si la première question vaut “Français”.',
        displayOrder: 2,
        questionsPerPage: 3,
        randomize: true,
        conditionExpression: { questionCode: 'Q-001', operator: 'equals', value: 'fr' },
        questions: [
          question('demo-q-q014', 'Q-014', 1, 'Le terme “coordination inter-site” est-il clair pour vous ?', 'likert', {
            required: true,
            helperText: 'Cette question mesure la compréhension du vocabulaire employé.',
            likert: likert(7, 'Pas du tout clair', 'Très clair', 'Ni clair ni pas clair'),
            popups: [popup('coordination_inter_site', 'Coordination inter-site', 'Capacité des équipes de bâtiments ou sites différents à partager les informations nécessaires au bon déroulement du parcours.')],
          }),
          question('demo-q-q015', 'Q-015', 2, 'Qu’est-ce qui rendrait cette formulation plus facile à comprendre ?', 'free_text_long', {
            helperText: 'Évitez de saisir des noms, emails ou informations directement identifiantes.',
          }),
          question('demo-q-q016', 'Q-016', 3, 'Le parcours présenté vous semble-t-il cohérent ?', 'likert', {
            required: true,
            helperText: 'Échelle de cohérence perçue.',
            likert: likert(5, 'Pas cohérent', 'Très cohérent', 'Neutre'),
          }),
        ],
      },
      {
        id: 'demo-group-chpm-final',
        title: 'Commentaires libres / Free comments',
        description: 'Synthèse qualitative finale, affichée après le choix de langue.',
        displayOrder: 3,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          question('demo-q-q027', 'Q-027', 1, 'Décrivez les difficultés rencontrées pendant le test / Describe any difficulties encountered during the test.', 'free_text_long', {
            helperText: 'Champ libre sauvegardé en brouillon avant soumission. Évitez les détails directement identifiants.',
          }),
        ],
      },
    ],
  }

  recomputeQuestionnaireCounters(questionnaire)
  return questionnaire
}

function createItqQuestionnaire(): ApiQuestionnaire {
  const itqScale = likert(5, 'Pas du tout', 'Extrêmement', 'Modérément', 0)
  const ptsdInstruction = 'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement. Indiquez à quel point vous avez été perturbé par ce problème le mois dernier.'
  const dsoInstruction = 'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement. Répondez à quel point l’énoncé est vrai vous concernant.'

  const questionnaire: ApiQuestionnaire = {
    id: 'demo-questionnaire-itq-cn2r',
    code: 'ITQ-CN2R',
    title: 'International Trauma Questionnaire (ITQ)',
    description: 'Version française de l’International Trauma Questionnaire : auto-questionnaire adulte lié au TSPT et au TSPT complexe selon la CIM-11.',
    defaultLanguage: 'fr',
    versionId: ITQ_VERSION_ID,
    version: '1.0-cn2r',
    versionLabel: '1.0-cn2r',
    language: 'fr',
    finality: 'Questionnaire d’auto-évaluation. Le seed structure les items et la cotation 0–4 ; il ne remplace pas une interprétation clinique qualifiée.',
    status: 'published',
    isPublished: true,
    openFrom: addDaysIso(-7),
    openUntil: addDaysIso(180),
    groupCount: 0,
    questionCount: 0,
    groups: [
      {
        id: 'demo-group-itq-contexte',
        title: 'Contexte de l’expérience',
        description: 'Merci d’indiquer quelle est l’expérience qui vous perturbe le plus et de répondre aux questions par rapport à cette expérience.',
        displayOrder: 1,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          question('demo-q-itq-exp-desc', 'ITQ-EXP-DESC', 1, 'Description de l’expérience', 'free_text_long', {
            helperText: 'Champ libre de contexte. Évitez les noms, emails, téléphones ou toute autre information directement identifiante.',
            popups: [popup('experience_perturbante', 'Expérience qui perturbe le plus', 'Dans l’ITQ, les réponses doivent être données par rapport à l’expérience stressante ou traumatique qui vous perturbe le plus. Évitez d’indiquer des détails directement identifiants.')],
          }),
          question('demo-q-itq-exp-date', 'ITQ-EXP-DATE', 2, 'Quand l’expérience s’est-elle passée ?', 'single_choice', {
            required: true,
            helperText: 'Sélectionnez la période la plus proche.',
            options: [
              ['moins_6_mois', 'Il y a moins de 6 mois'],
              ['6_12_mois', '6 à 12 mois'],
              ['1_5_ans', '1 à 5 ans'],
              ['5_10_ans', '5 à 10 ans'],
              ['10_20_ans', '10 à 20 ans'],
              ['plus_20_ans', 'Il y a plus de 20 ans'],
            ],
            popups: [popup('periode_experience', 'Période de l’expérience', 'Cette question situe approximativement l’ancienneté de l’expérience. Choisissez la période la plus proche, sans ajouter de date précise si elle permettrait de vous identifier.')],
          }),
        ],
      },
      {
        id: 'demo-group-itq-tspt-symptomes',
        title: 'TSPT · Symptômes du dernier mois',
        description: 'Merci de lire chaque item attentivement, puis d’indiquer à quel point vous avez été perturbé par ce problème le mois dernier.',
        displayOrder: 2,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          itqQuestion('P1', 1, 'Avoir des rêves perturbants où se rejoue une partie de l’expérience ou qui sont clairement en relation avec l’expérience ?', ptsdInstruction, itqScale, 'Rêves perturbants · Revivre l’expérience', 'Cet item fait partie de la dimension “Revivre l’expérience” de l’ITQ.'),
          itqQuestion('P2', 2, 'Avoir des images ou des souvenirs forts qui viennent à l’esprit comme si l’expérience se rejoue ici et maintenant ?', ptsdInstruction, itqScale, 'Images ou souvenirs forts · Revivre l’expérience', 'Cet item vise les images ou souvenirs intenses qui surviennent comme si l’expérience se rejouait ici et maintenant.'),
          itqQuestion('P3', 3, 'Éviter les ressentis qui rappellent l’expérience, par exemple pensées, sentiments ou sensations physiques ?', ptsdInstruction, itqScale, 'Éviter les ressentis · Évitement', 'Cet item concerne l’évitement de rappels internes de l’expérience.'),
          itqQuestion('P4', 4, 'Éviter les éléments extérieurs qui rappellent l’expérience, par exemple personnes, lieux, conversations, objets, activités ou situations ?', ptsdInstruction, itqScale, 'Éléments extérieurs · Évitement', 'Cet item concerne l’évitement de rappels extérieurs.'),
          itqQuestion('P5', 5, 'Être en état de super-alerte, vigilance ou sur ses gardes ?', ptsdInstruction, itqScale, 'Super-alerte / vigilance · Sentiment de menace', 'Cet item correspond au fait de rester en hypervigilance, sur ses gardes ou en état de super-alerte.'),
          itqQuestion('P6', 6, 'Réaction exagérée de surprise ou sursaut ?', ptsdInstruction, itqScale, 'Sursaut · Sentiment de menace', 'Cet item concerne les réactions de surprise ou de sursaut exagérées.'),
        ],
      },
      {
        id: 'demo-group-itq-tspt-retentissement',
        title: 'TSPT · Retentissement fonctionnel',
        description: 'Au cours du dernier mois, les symptômes ci-dessus ont-ils affecté votre fonctionnement ?',
        displayOrder: 3,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          itqQuestion('P7', 1, 'Est-ce que cela a affecté vos relations et votre vie sociale ?', ptsdInstruction, itqScale, 'Relations et vie sociale · Retentissement', 'Cet item évalue l’impact sur les relations et la vie sociale.'),
          itqQuestion('P8', 2, 'Est-ce que cela a affecté votre travail ou votre capacité à travailler ?', ptsdInstruction, itqScale, 'Travail ou capacité à travailler · Retentissement', 'Cet item évalue l’impact sur le travail ou la capacité à travailler.'),
          itqQuestion('P9', 3, 'Est-ce que cela a affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?', ptsdInstruction, itqScale, 'Autres activités importantes · Retentissement', 'Cet item évalue l’impact sur les enfants, les études ou d’autres activités importantes.'),
        ],
      },
      {
        id: 'demo-group-itq-pos',
        title: 'Perturbations dans l’organisation de soi',
        description: 'Les questions suivantes se rapportent à la manière dont vous vous sentez typiquement, pensez de vous-même typiquement, ou êtes typiquement en relation avec les autres.',
        displayOrder: 4,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          itqQuestion('C1', 1, 'Quand je suis contrarié.e, il me faut beaucoup de temps pour me calmer', dsoInstruction, itqScale, 'Régulation émotionnelle', 'Cet item concerne la difficulté à retrouver son calme lorsqu’on est contrarié.'),
          itqQuestion('C2', 2, 'Je me sens insensible ou émotionnellement éteint.e', dsoInstruction, itqScale, 'Insensibilité émotionnelle · Régulation émotionnelle', 'Cet item concerne le fait de se sentir insensible ou émotionnellement éteint.'),
          itqQuestion('C3', 3, 'Je me sens nul.le', dsoInstruction, itqScale, 'Perception de soi négative', 'Cet item concerne le fait de se sentir nul.le.'),
          itqQuestion('C4', 4, 'Je me sens sans valeur', dsoInstruction, itqScale, 'Sans valeur · Perception de soi négative', 'Cet item concerne le fait de se sentir sans valeur.'),
          itqQuestion('C5', 5, 'Je me sens distant.e ou coupé.e des autres', dsoInstruction, itqScale, 'Distance avec les autres · Relations', 'Cet item concerne le sentiment d’être distant.e ou coupé.e des autres.'),
          itqQuestion('C6', 6, 'Je trouve qu’il est difficile de rester émotionnellement proche des autres', dsoInstruction, itqScale, 'Proximité émotionnelle · Relations', 'Cet item concerne la difficulté à rester émotionnellement proche des autres.'),
        ],
      },
      {
        id: 'demo-group-itq-pos-retentissement',
        title: 'Perturbations dans l’organisation de soi · Retentissement fonctionnel',
        description: 'Au cours du dernier mois, les problèmes ci-dessus relatifs à vos émotions, aux croyances sur vous-même et dans vos relations ont-ils eu un retentissement ?',
        displayOrder: 5,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          itqQuestion('C7', 1, 'Créé de l’inquiétude ou de la détresse concernant vos relations ou votre vie sociale ?', dsoInstruction, itqScale, 'Retentissement relationnel · POS', 'Cet item évalue l’inquiétude ou la détresse concernant les relations ou la vie sociale.'),
          itqQuestion('C8', 2, 'Affecté votre travail ou capacité à travailler ?', dsoInstruction, itqScale, 'Retentissement professionnel · POS', 'Cet item évalue l’impact sur le travail ou la capacité à travailler.'),
          itqQuestion('C9', 3, 'Affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?', dsoInstruction, itqScale, 'Retentissement sur les activités · POS', 'Cet item évalue l’impact sur les enfants, les études ou d’autres activités importantes.'),
        ],
      },
    ],
  }

  recomputeQuestionnaireCounters(questionnaire)
  return questionnaire
}

function createPilotQuestionnaire(): ApiQuestionnaire {
  const questionnaire: ApiQuestionnaire = {
    id: 'demo-questionnaire-pilot',
    code: 'CHPM-PILOT',
    title: 'Questionnaire pilote',
    description: 'Questionnaire brouillon non diffusé.',
    defaultLanguage: 'fr',
    versionId: 'demo-version-pilot-0-9',
    version: '0.9',
    versionLabel: '0.9',
    language: 'fr',
    finality: null,
    status: 'draft',
    isPublished: false,
    groupCount: 1,
    questionCount: 1,
    groups: [
      {
        id: 'demo-group-pilot',
        title: 'Pilote',
        description: null,
        displayOrder: 1,
        questionsPerPage: 1,
        randomize: false,
        questions: [question('demo-q-pilot-1', 'P-001', 1, 'Question pilote de validation', 'information', { helperText: 'Visible uniquement pour les administrateurs.' })],
      },
    ],
  }

  return questionnaire
}

function createInitialInvitations(): ApiInvitation[] {
  const mtl = buildingSeeds[0]
  if (!mtl) return []
  const submitted = Array.from({ length: 6 }, (_, index) => ({
    id: `demo-invitation-submitted-${index + 1}`,
    publicCode: index === 0 ? '8F4K-29QX' : `DEMO-${String(index + 1).padStart(4, '0')}`,
    status: 'submitted' as InvitationStatus,
    maskedEmail: `r***.${index + 1}@example.org`,
    questionnaireVersionId: CHPM_VERSION_ID,
    questionnaireTitle: 'Questionnaire CHPM',
    versionLabel: '1.4',
    building: mtl,
    expiresAt: addDaysIso(30),
    sentAt: addDaysIso(-9),
    openedAt: addDaysIso(-8),
    startedAt: addDaysIso(-8),
    submittedAt: addDaysIso(-(6 - index)),
    responseStatus: 'locked' as SubmissionStatus,
  }))

  return [
    {
      id: 'demo-invitation-itq-open',
      publicCode: 'ITQ-0001',
      status: 'sent',
      maskedEmail: 'i***@example.org',
      questionnaireVersionId: ITQ_VERSION_ID,
      questionnaireTitle: 'International Trauma Questionnaire (ITQ)',
      versionLabel: '1.0-cn2r',
      building: mtl,
      expiresAt: addDaysIso(30),
      sentAt: nowIso(),
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      responseStatus: null,
    },
    {
      id: 'demo-invitation-pending',
      publicCode: 'PEND-0001',
      status: 'sent',
      maskedEmail: 'p***@example.org',
      questionnaireVersionId: CHPM_VERSION_ID,
      questionnaireTitle: 'Questionnaire CHPM',
      versionLabel: '1.4',
      building: mtl,
      expiresAt: addDaysIso(30),
      sentAt: nowIso(),
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      responseStatus: null,
    },
    {
      id: 'demo-invitation-expired-draft',
      publicCode: 'EXP-0001',
      status: 'in_progress',
      maskedEmail: 'e***@example.org',
      questionnaireVersionId: CHPM_VERSION_ID,
      questionnaireTitle: 'Questionnaire CHPM',
      versionLabel: '1.4',
      building: mtl,
      expiresAt: addDaysIso(-3),
      sentAt: addDaysIso(-35),
      openedAt: addDaysIso(-34),
      startedAt: addDaysIso(-34),
      submittedAt: null,
      responseStatus: 'draft' as SubmissionStatus,
    },
    ...submitted,
  ]
}

function createInitialRespondentSessions(): RespondentSessionMap {
  const questionnaires = createInitialQuestionnaires()
  const chpm = questionnaires.find((questionnaire) => questionnaire.versionId === CHPM_VERSION_ID)
  const itq = questionnaires.find((questionnaire) => questionnaire.versionId === ITQ_VERSION_ID)
  const building = buildingSeeds[0]

  if (!chpm || !itq || !building) {
    return {}
  }

  const expiredDraft = createRespondentSession('demo-expired-draft', chpm, building, 'EXP-0001', 'draft')
  expiredDraft.invitation.expiresAt = addDaysIso(-3)
  expiredDraft.invitation.status = 'in_progress'
  expiredDraft.responseSession.startedAt = addDaysIso(-34)

  return {
    [CHPM_TOKEN]: createRespondentSession(CHPM_TOKEN, chpm, building, 'PEND-0001', 'draft'),
    [ITQ_TOKEN]: createRespondentSession(ITQ_TOKEN, itq, building, 'ITQ-0001', 'draft'),
    'demo-expired-draft': expiredDraft,
  }
}

function createRespondentSession(
  _token: string,
  questionnaire: ApiQuestionnaire,
  building: ApiBuilding,
  publicCode: string,
  status: SubmissionStatus,
): RespondentSessionResponse {
  return {
    responseSession: {
      id: createId('session'),
      publicCode,
      status,
      currentPage: 0,
      startedAt: nowIso(),
      submittedAt: null,
      lockedAt: null,
    },
    invitation: {
      publicCode,
      status: status === 'locked' ? 'submitted' : 'sent',
      expiresAt: addDaysIso(30),
      building,
    },
    questionnaire: {
      id: questionnaire.id,
      versionId: questionnaire.versionId,
      title: questionnaire.title,
      description: questionnaire.description ?? null,
      finality: questionnaire.finality ?? null,
      versionLabel: questionnaire.versionLabel,
      language: questionnaire.language,
      groups: questionnaire.groups.map((group) => ({
        id: group.id,
        title: group.title,
        description: group.description,
        questionsPerPage: group.questionsPerPage ?? 1,
        randomize: group.randomize,
        questions: group.questions.map((questionItem) => ({
          ...questionItem,
          label: questionItem.label ?? questionItem.title,
          responseType: questionItem.responseType ?? questionItem.type,
          answer: null,
        })),
      })),
    },
  }
}


function getNotificationSubscriptions(): ApiNotificationSubscription[] {
  const currentUser = safeCurrentUser()
  const subscriptions = readStorage(NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY, createInitialNotificationSubscriptions)

  if (!currentUser) {
    return []
  }

  return subscriptions.filter((subscription) => subscription.userId === `demo-user-${currentUser.role}`)
}

function saveNotificationSubscriptions(subscriptions: ApiNotificationSubscription[]): void {
  window.localStorage.setItem(NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscriptions))
}

function createInitialNotificationSubscriptions(): ApiNotificationSubscription[] {
  const createdAt = addDaysIso(-2)

  return [
    createNotificationSubscription({
      id: 'demo-notification-admin-chpm-immediate',
      userId: 'demo-user-admin',
      questionnaireVersionId: CHPM_VERSION_ID,
      eventType: 'submission_received',
      channel: 'email',
      frequency: 'immediate',
      digestHour: 8,
      isEnabled: true,
      createdAt,
      lastDeliveredAt: addDaysIso(-1),
    }),
    createNotificationSubscription({
      id: 'demo-notification-moderator-itq-daily',
      userId: 'demo-user-moderator',
      questionnaireVersionId: ITQ_VERSION_ID,
      eventType: 'submission_received',
      channel: 'internal',
      frequency: 'daily',
      digestHour: 9,
      isEnabled: true,
      createdAt,
      lastDeliveredAt: null,
    }),
  ]
}

function createNotificationSubscription(input: {
  id: string
  userId: string
  questionnaireVersionId: string | null
  eventType: ApiNotificationSubscription['eventType']
  channel: ApiNotificationSubscription['channel']
  frequency: ApiNotificationSubscription['frequency']
  digestHour: number
  isEnabled: boolean
  createdAt: string
  lastDeliveredAt: string | null
}): ApiNotificationSubscription {
  return {
    id: input.id,
    userId: input.userId,
    questionnaireVersionId: input.questionnaireVersionId,
    buildingId: null,
    eventType: input.eventType,
    channel: input.channel,
    frequency: input.frequency,
    digestHour: input.digestHour,
    isEnabled: input.isEnabled,
    lastDeliveredAt: input.lastDeliveredAt,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    questionnaireVersion: getQuestionnaireVersionSnapshot(input.questionnaireVersionId),
  }
}

function getQuestionnaireVersionSnapshot(versionId: string | null): ApiNotificationSubscription['questionnaireVersion'] {
  if (!versionId) {
    return null
  }

  const questionnaire = getQuestionnaires().find((candidate) => candidate.versionId === versionId)
  if (!questionnaire) {
    return null
  }

  return {
    id: questionnaire.versionId,
    versionLabel: questionnaire.versionLabel,
    questionnaire: {
      id: questionnaire.id,
      title: questionnaire.title,
      code: questionnaire.code,
    },
  }
}

function upsertNotificationSubscription(payload: UpsertNotificationSubscriptionRequest): ApiNotificationSubscription {
  const currentUser = safeCurrentUser()

  if (!currentUser) {
    throw new Error('Session requise pour modifier les notifications.')
  }

  const subscriptions = readStorage(NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY, createInitialNotificationSubscriptions)
  const userId = `demo-user-${currentUser.role}`
  const questionnaireVersionId = payload.questionnaireVersionId ?? null
  const buildingId = payload.buildingId ?? null
  const eventType = payload.eventType
  const existing = subscriptions.find((subscription) =>
    subscription.userId === userId
    && subscription.eventType === eventType
    && subscription.questionnaireVersionId === questionnaireVersionId
    && subscription.buildingId === buildingId,
  )

  if (existing) {
    existing.channel = payload.channel ?? existing.channel
    existing.frequency = payload.frequency ?? existing.frequency
    existing.digestHour = payload.digestHour ?? existing.digestHour
    existing.isEnabled = payload.isEnabled ?? existing.isEnabled
    existing.updatedAt = nowIso()
    existing.questionnaireVersion = getQuestionnaireVersionSnapshot(questionnaireVersionId)
    saveNotificationSubscriptions(subscriptions)
    appendAuditLog('notification.preference.updated', 'NotificationSubscription', existing.id, null, {
      eventType,
      channel: existing.channel,
      frequency: existing.frequency,
      questionnaireVersionId,
      simulation: true,
    })
    return existing
  }

  const created = createNotificationSubscription({
    id: createId('notification-subscription'),
    userId,
    questionnaireVersionId,
    eventType,
    channel: payload.channel ?? 'email',
    frequency: payload.frequency ?? 'immediate',
    digestHour: payload.digestHour ?? 8,
    isEnabled: payload.isEnabled ?? true,
    createdAt: nowIso(),
    lastDeliveredAt: null,
  })
  created.buildingId = buildingId
  subscriptions.unshift(created)
  saveNotificationSubscriptions(subscriptions)
  appendAuditLog('notification.preference.created', 'NotificationSubscription', created.id, null, {
    eventType,
    channel: created.channel,
    frequency: created.frequency,
    questionnaireVersionId,
    simulation: true,
  })
  return created
}

function notifyDemoSubmission(session: RespondentSessionResponse, answerCount: number, submittedAt: string): void {
  const subscriptions = readStorage(NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY, createInitialNotificationSubscriptions)
  const matchingSubscriptions = subscriptions.filter((subscription) =>
    subscription.isEnabled
    && subscription.eventType === 'submission_received'
    && (!subscription.questionnaireVersionId || subscription.questionnaireVersionId === session.questionnaire.versionId),
  )

  for (const subscription of matchingSubscriptions) {
    const action = subscription.frequency === 'immediate'
      ? `notification.${subscription.channel}.simulated`
      : `notification.${subscription.channel}.daily_digest_queued`

    if (subscription.frequency === 'immediate') {
      subscription.lastDeliveredAt = submittedAt
    }

    subscription.updatedAt = submittedAt
    appendAuditLog(action, 'RespondentSession', session.responseSession.id, session.responseSession.publicCode, {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      questionnaireVersionId: session.questionnaire.versionId,
      questionnaireTitle: session.questionnaire.title,
      answerCount,
      directEmailVisible: false,
      simulation: true,
    })
  }

  saveNotificationSubscriptions(subscriptions)
}


function runDemoDailyDigests(): NotificationDigestRunResponse {
  const now = nowIso()
  const subscriptions = readStorage(NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY, createInitialNotificationSubscriptions)
  const delivered = subscriptions
    .filter((subscription) => subscription.isEnabled && subscription.frequency === 'daily')
    .map((subscription) => {
      subscription.lastDeliveredAt = now
      subscription.updatedAt = now
      const publicCodes = ['8F4K-29QX']
      appendAuditLog('notification.daily_digest.sent', 'NotificationSubscription', subscription.id, null, {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        queuedEventCount: publicCodes.length,
        publicCodes,
        directEmailVisible: false,
        simulation: true,
      })
      return {
        subscriptionId: subscription.id,
        recipientUserId: subscription.userId,
        queuedEventCount: publicCodes.length,
        publicCodes,
      }
    })

  saveNotificationSubscriptions(subscriptions)

  return {
    result: {
      processedAt: now,
      dueSubscriptionCount: delivered.length,
      deliveredDigestCount: delivered.length,
      dryRun: false,
      delivered,
    },
  }
}

function getTechnicalRegister(): TechnicalRegisterResponse {
  const currentUser = safeCurrentUser()

  return {
    register: {
      generatedAt: nowIso(),
      controller: 'CHPM · Démonstration MVP',
      dpoContact: 'dpo@chpm.local',
      consultedByRole: currentUser?.role ?? 'respondent',
      processing: [
        {
          name: 'Gestion des questionnaires',
          finality: 'Créer, publier et versionner des questionnaires adaptatifs.',
          lawfulBasis: 'Mission d’intérêt public / intérêt légitime selon le contexte de déploiement.',
          dataCategories: ['métadonnées de questionnaire', 'questions', 'popups explicatifs', 'versions publiées'],
          recipients: ['administrateurs', 'responsables questionnaire', 'modérateurs autorisés'],
          storage: 'schéma opérationnel Prisma, hors coffre identité.',
        },
        {
          name: 'Collecte des réponses',
          finality: 'Mesurer la compréhension et agréger les résultats sans accès direct aux emails.',
          lawfulBasis: 'Consentement/information répondant et protocole interne documenté.',
          dataCategories: ['code public pseudonyme', 'réponses', 'télémétrie UX', 'statut de session'],
          recipients: ['administrateurs', 'analystes autorisés', 'DPO'],
          storage: 'tables ResponseSession, Answer, TelemetryEvent.',
        },
        {
          name: 'Coffre identité email',
          finality: 'Acheminer les invitations et permettre une levée d’identité strictement contrôlée.',
          lawfulBasis: 'Obligation légale ou procédure judiciaire validée.',
          dataCategories: ['email chiffré', 'hash email', 'clé de chiffrement référencée'],
          recipients: ['workflow judiciaire double validation uniquement'],
          storage: 'schéma identity séparé ; aucune exposition dans les vues métier.',
        },
      ],
      safeguards: [
        'RBAC par rôle et permissions applicatives.',
        'Export pseudonymisé sans email en clair.',
        'Journalisation des actions sensibles.',
        'Rate limiting HTTP basique côté API.',
        'Expiration des invitations et nettoyage des brouillons prévus dans les tâches de maintenance.',
      ],
    },
  }
}

function getRetentionPolicy(): RetentionPolicyResponse {
  return {
    policy: {
      generatedAt: nowIso(),
      rules: [
        { object: 'Invitation', retention: '30 jours après émission sauf soumission', action: 'expiration automatique', endpoint: 'POST /compliance/maintenance/expire-invitations' },
        { object: 'RespondentSession brouillon', retention: '30 jours après dernière activité', action: 'suppression du brouillon et audit', endpoint: 'POST /compliance/maintenance/cleanup-drafts' },
        { object: 'Réponses soumises', retention: 'durée du protocole + archive réglementaire', action: 'conservation pseudonymisée', endpoint: 'GET /compliance/exports/pseudonymized' },
        { object: 'Coffre email', retention: 'durée minimale nécessaire à la preuve d’invitation', action: 'accès judiciaire uniquement', endpoint: 'POST /judicial-access/requests' },
        { object: 'AuditLog', retention: '24 mois MVP', action: 'consultation DPO / admin', endpoint: 'GET /audit-logs' },
      ],
      knownLimitations: [
        'Le MVP simule l’envoi email en mode démo ; un SMTP transactionnel doit être branché en production.',
        'Le rate limiting mémoire doit être remplacé par Redis ou équivalent en environnement multi-instance.',
        'La purge physique planifiée doit être orchestrée par cron/job scheduler côté production.',
      ],
    },
  }
}

function expireDemoInvitations(): ComplianceMaintenanceResponse {
  const now = Date.now()
  const invitations = getInvitations()
  let expiredCount = 0

  for (const invitation of invitations) {
    const expiresAt = Date.parse(invitation.expiresAt)
    if (Number.isFinite(expiresAt) && expiresAt < now && !['submitted', 'expired'].includes(invitation.status)) {
      invitation.status = 'expired'
      invitation.responseStatus = invitation.responseStatus === 'locked' ? invitation.responseStatus : 'abandoned'
      expiredCount += 1
    }
  }

  if (expiredCount > 0) {
    const sessions = getRespondentSessions()
    for (const session of Object.values(sessions)) {
      if (Date.parse(session.invitation.expiresAt) < now && session.responseSession.status !== 'locked') {
        session.invitation.status = 'expired'
      }
    }
    saveRespondentSessions(sessions)
  }

  saveInvitations(invitations)
  appendAuditLog('compliance.invitations.expired', 'Invitation', null, null, { expiredCount, simulation: true })

  return {
    result: {
      expiredCount,
      executedAt: nowIso(),
    },
  }
}

function cleanupDemoDrafts(): ComplianceMaintenanceResponse {
  const sessions = getRespondentSessions()
  const now = Date.now()
  const nextSessions: RespondentSessionMap = {}
  let deletedDraftSessionCount = 0

  for (const [token, session] of Object.entries(sessions)) {
    const expired = Date.parse(session.invitation.expiresAt) < now
    if (expired && session.responseSession.status !== 'locked') {
      deletedDraftSessionCount += 1
      continue
    }
    nextSessions[token] = session
  }

  saveRespondentSessions(nextSessions)
  appendAuditLog('compliance.drafts.cleaned', 'RespondentSession', null, null, { deletedDraftSessionCount, simulation: true })

  return {
    result: {
      deletedDraftSessionCount,
      cutoff: nowIso(),
      executedAt: nowIso(),
    },
  }
}

function getPseudonymizedExport(questionnaireId?: string): PseudonymizedExportResponse {
  const questionnaires = getQuestionnaires()
  const questionnaire = questionnaires.find((candidate) => candidate.id === questionnaireId) ?? questionnaires[0]

  if (!questionnaire) {
    throw new Error('Questionnaire introuvable pour export pseudonymisé.')
  }

  const questions = questionnaire.groups.flatMap((group) => group.questions)
  const rows = createDemoSubmissions(questionnaire).map((submission, submissionIndex) => ({
    publicCode: submission.publicCode,
    questionnaireId: questionnaire.id,
    questionnaireCode: questionnaire.code,
    versionId: questionnaire.versionId,
    versionLabel: questionnaire.versionLabel,
    buildingCode: 'MTL-A',
    buildingLabel: submission.building,
    submittedAt: submission.submittedAt,
    answerCount: submission.answerCount,
    telemetryEventCount: submission.telemetryEvents,
    answers: questions.slice(0, Math.min(8, questions.length)).map((questionItem, answerIndex) => ({
      questionCode: questionItem.code,
      responseType: questionItem.responseType ?? questionItem.type,
      value: pseudonymizedDemoAnswerValue(questionItem, submissionIndex, answerIndex),
      warning: isFreeTextQuestion(questionItem) ? 'Réponse libre pseudonymisée : contenu direct potentiellement identifiant masqué.' : null,
    })),
  }))
  const fingerprint = `demo-sha256-${btoa(`${questionnaire.id}:${rows.length}:${rows[0]?.publicCode ?? 'none'}`).replace(/=+$/g, '').slice(0, 24)}`

  appendAuditLog('compliance.export.pseudonymized', 'QuestionnaireVersion', questionnaire.versionId, null, {
    questionnaireId: questionnaire.id,
    rowCount: rows.length,
    containsDirectEmail: false,
    fingerprint,
    simulation: true,
  })

  return {
    export: {
      generatedAt: nowIso(),
      generatedByRole: safeCurrentUser()?.role ?? 'respondent',
      questionnaire: {
        id: questionnaire.id,
        code: questionnaire.code,
        title: questionnaire.title,
      },
      rowCount: rows.length,
      containsDirectEmail: false,
      identityVaultExcluded: true,
      fingerprint,
      rows,
    },
  }
}

function pseudonymizedDemoAnswerValue(questionItem: ApiQuestion, submissionIndex: number, answerIndex: number): unknown {
  const responseType = questionItem.responseType ?? questionItem.type
  if (responseType === 'likert') {
    return Math.min((questionItem.likertScale?.minValue ?? 1) + ((submissionIndex + answerIndex) % (questionItem.likertScale?.points ?? 5)), (questionItem.likertScale?.minValue ?? 1) + (questionItem.likertScale?.points ?? 5) - 1)
  }

  if (responseType === 'single_choice') {
    const options = questionItem.options ?? []
    return options.length > 0 ? options[(submissionIndex + answerIndex) % options.length]?.value ?? null : null
  }

  if (isFreeTextQuestion(questionItem)) {
    return '[contenu libre masqué dans l’export pseudonymisé MVP]'
  }

  return null
}

function isFreeTextQuestion(questionItem: ApiQuestion): boolean {
  const responseType = questionItem.responseType ?? questionItem.type
  return responseType === 'free_text' || responseType === 'free_text_short' || responseType === 'free_text_long'
}

function getAuditLogs(limit = 30): AuditLogsResponse['logs'] {
  return readStorage(AUDIT_LOGS_STORAGE_KEY, createInitialAuditLogs).slice(0, Math.max(1, limit))
}

function saveAuditLogs(logs: AuditLogsResponse['logs']): void {
  window.localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs))
}

function createInitialAuditLogs(): AuditLogsResponse['logs'] {
  return [
    createAuditLogRecord('judicial.request.received', 'JudicialAccessRequest', 'demo-jar-001', '8F4K-29QX', { workflow: 'double_validation', simulation: true }, addDaysIso(-1), 'demo-user-dpo'),
    createAuditLogRecord('notification.email.simulated', 'ResponseSubmission', 'demo-submission-001', '8F4K-29QX', { channel: 'email', directEmailVisible: false, simulation: true }, addDaysIso(-2), 'demo-user-admin'),
    createAuditLogRecord('identity.vault.access.denied', 'IdentityVaultEntry', null, '8F4K-29QX', { reason: 'rôle non judiciaire', directEmailVisible: false, simulation: true }, addDaysIso(-3), 'demo-user-admin'),
  ]
}

function appendAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  publicCode: string | null,
  metadata: JsonRecord | null = null,
): AuditLogsResponse['logs'][number] {
  const logs = readStorage(AUDIT_LOGS_STORAGE_KEY, createInitialAuditLogs)
  const currentUser = safeCurrentUser()
  const actorUserId = currentUser ? `demo-user-${currentUser.role}` : null
  const log = createAuditLogRecord(action, entityType, entityId, publicCode, metadata, nowIso(), actorUserId)
  logs.unshift(log)
  saveAuditLogs(logs.slice(0, 100))
  return log
}

function createAuditLogRecord(
  action: string,
  entityType: string,
  entityId: string | null,
  publicCode: string | null,
  metadata: JsonRecord | null,
  occurredAt: string,
  actorUserId: string | null,
): AuditLogsResponse['logs'][number] {
  const actorSeed = actorUserId ? demoUsers.find((candidate) => `demo-user-${candidate.role}` === actorUserId) ?? null : null

  return {
    id: createId('audit'),
    actorUserId,
    action,
    entityType,
    entityId,
    publicCode,
    metadata,
    ipAddress: '127.0.0.1',
    userAgent: 'CHPM demo browser',
    occurredAt,
    actor: actorSeed
      ? {
          id: `demo-user-${actorSeed.role}`,
          displayName: actorSeed.displayName,
          email: actorSeed.email,
          role: actorSeed.role,
        }
      : null,
  }
}

function createStats(questionnaireId: string): StatsResponse['stats'] {
  const questionnaire = getQuestionnaires().find((candidate) => candidate.id === questionnaireId) ?? getQuestionnaires()[0]

  if (!questionnaire) {
    throw new Error('Questionnaire introuvable pour les statistiques de démonstration.')
  }

  const questions = questionnaire.groups.flatMap((group) => group.questions)
  const submissions = createDemoSubmissions(questionnaire)
  const isItq = questionnaire.code === 'ITQ-CN2R'

  return {
    questionnaire: { id: questionnaire.id, code: questionnaire.code, title: questionnaire.title },
    threshold: 5,
    totals: {
      invited: 8,
      opened: 7,
      started: 7,
      submitted: 6,
      abandoned: 1,
      expired: 0,
      openingRate: 88,
      startRate: 88,
      submissionRate: 75,
      completionRate: 75,
      abandonmentRate: 14,
      telemetryEvents: isItq ? 96 : 30,
      popupOpens: isItq ? 42 : 9,
      answerChanges: 7,
      backtracks: 3,
      resumes: 3,
      medianTotalDurationMs: isItq ? 9 * 60 * 1000 : 4 * 60 * 1000,
    },
    versions: [
      {
        id: questionnaire.versionId,
        versionLabel: questionnaire.versionLabel,
        status: questionnaire.status,
        invited: 8,
        opened: 7,
        started: 7,
        submitted: 6,
        abandoned: 1,
        openingRate: 88,
        startRate: 88,
        submissionRate: 75,
        completionRate: 75,
        abandonmentRate: 14,
        effectifSufficient: true,
      },
    ],
    buildings: [
      {
        buildingId: 'demo-building-mtl-a',
        label: 'Montréal · Bâtiment A',
        invited: 8,
        opened: 7,
        started: 7,
        submitted: 6,
        effectifSufficient: true,
        openingRate: 88,
        startRate: 88,
        submissionRate: 75,
        completionRate: 75,
        displayValue: '6 soumis',
      },
      {
        buildingId: 'demo-building-par-c',
        label: 'Paris · Bâtiment C',
        invited: null,
        opened: null,
        started: null,
        submitted: null,
        effectifSufficient: false,
        openingRate: null,
        startRate: null,
        submissionRate: null,
        completionRate: null,
        displayValue: 'effectif insuffisant',
      },
    ],
    groups: questionnaire.groups.map((group, index) => ({
      id: group.id,
      title: group.title,
      versionId: questionnaire.versionId,
      versionLabel: questionnaire.versionLabel,
      questionCount: group.questions.length,
      answerCount: index < 5 ? group.questions.length * 6 : null,
      respondentCount: index < 5 ? 6 : null,
      popupOpens: index < 5 ? Math.max(0, group.questions.length * 2 - index) : null,
      medianDurationMs: index < 5 ? 65_000 + index * 20_000 : null,
      effectifSufficient: index < 5,
      displayValue: index < 5 ? '6 répondant(s)' : 'effectif insuffisant',
    })),
    questions: questions.slice(0, isItq ? 18 : 12).map((questionItem, index) => {
      const responseType = questionItem.responseType ?? questionItem.type
      const effectifSufficient = index < 16
      const hasPopup = Boolean(questionItem.popupDefinitions?.length)
      const isLikert = responseType === 'likert'
      const isFreeText = responseType === 'free_text' || responseType === 'free_text_short' || responseType === 'free_text_long'
      const highMedianDuration = effectifSufficient && (index % 4 === 0 || hasPopup)
      const popupOftenOpened = effectifSufficient && hasPopup
      const difficultyLabels = [
        ...(highMedianDuration ? ['temps médian élevé'] : []),
        ...(popupOftenOpened ? ['popup souvent ouverte'] : []),
      ]

      return {
        id: questionItem.id,
        code: questionItem.code,
        label: questionItem.label ?? questionItem.title,
        responseType,
        answerCount: effectifSufficient ? 6 : null,
        popupOpens: effectifSufficient ? (hasPopup ? 6 + index : index % 3 === 0 ? 2 : 0) : null,
        popupOpenRate: effectifSufficient ? (hasPopup ? 86 : index % 3 === 0 ? 33 : 0) : null,
        responseChanges: effectifSufficient ? (index % 2 === 0 ? 1 : 0) : null,
        backtracks: effectifSufficient ? (index % 5 === 0 ? 1 : 0) : null,
        medianDurationMs: effectifSufficient ? 35_000 + index * 4_000 : null,
        likertDistribution: isLikert && effectifSufficient ? createDemoLikertDistribution(questionItem) : null,
        freeTextResponses: isFreeText && effectifSufficient ? [
          { publicCode: submissions[0]?.publicCode ?? '8F4K-29QX', value: 'Formulation globalement claire, mais certains termes méritent une bulle plus visible.', warning: null },
          { publicCode: submissions[1]?.publicCode ?? 'DEMO-0002', value: 'Aucune difficulté majeure pendant le test.', warning: null },
        ] : [],
        freeTextAccess: isFreeText ? 'granted' : 'not_applicable',
        highMedianDuration,
        popupOftenOpened,
        difficultQuestion: difficultyLabels.length > 0,
        difficultyLabels: effectifSufficient ? difficultyLabels : [],
        effectifSufficient,
        displayValue: effectifSufficient ? '6 réponse(s)' : 'effectif insuffisant',
      }
    }),
    submissions,
  }
}

function createDemoSubmissions(questionnaire: ApiQuestionnaire): StatsResponse['stats']['submissions'] {
  return Array.from({ length: 6 }, (_, index) => ({
    publicCode: index === 0 ? '8F4K-29QX' : `DEMO-${String(index + 1).padStart(4, '0')}`,
    building: 'Montréal · Bâtiment A',
    status: 'locked',
    startedAt: addDaysIso(-(8 - index)),
    submittedAt: addDaysIso(-(6 - index)),
    answerCount: questionnaire.code === 'ITQ-CN2R' ? 20 : 6,
    totalDurationMs: (questionnaire.code === 'ITQ-CN2R' ? 8 * 60_000 : 4 * 60_000) + index * 25_000,
    telemetryEvents: questionnaire.code === 'ITQ-CN2R' ? 16 + index : 5 + index,
    versionLabel: questionnaire.versionLabel,
  }))
}

function createDemoLikertDistribution(questionItem: ApiQuestion): Array<{ value: number; label: string; count: number; rate: number }> {
  const scale = questionItem.likertScale
  const minValue = scale?.minValue ?? 1
  const points = scale?.points ?? 5
  return Array.from({ length: points }, (_, index) => {
    const value = minValue + index
    const count = index === points - 1 ? 2 : index === points - 2 ? 2 : index === Math.floor(points / 2) ? 1 : index === 0 ? 1 : 0
    return {
      value,
      label: value === minValue
        ? scale?.leftAnchor ?? String(value)
        : value === minValue + points - 1
          ? scale?.rightAnchor ?? String(value)
          : scale?.neutralLabel && index === Math.floor(points / 2)
            ? scale.neutralLabel
            : String(value),
      count,
      rate: Math.round((count / 6) * 100),
    }
  })
}

function getSubmissionDetails(publicCode: string): SubmissionDetailsResponse {
  const questionnaire = getQuestionnaires()[0]

  if (!questionnaire) {
    throw new Error('Questionnaire introuvable pour la soumission de démonstration.')
  }

  const submission = createDemoSubmissions(questionnaire)[0]

  if (!submission) {
    throw new Error('Soumission de démonstration introuvable.')
  }

  const answers = questionnaire.groups.flatMap((group) => group.questions).slice(0, 6).map((questionItem, index) => ({
    questionCode: questionItem.code,
    questionLabel: questionItem.label ?? questionItem.title,
    responseType: questionItem.responseType ?? questionItem.type,
    value: questionItem.responseType === 'likert' ? (index % 2 === 0 ? 6 : 5) : index === 0 ? 'fr' : index === 1 ? 'yes' : 'Aucune difficulté majeure pendant le test.',
    warning: null,
  }))

  return {
    submission: {
      publicCode,
      status: submission.status,
      submittedAt: submission.submittedAt,
      startedAt: submission.startedAt,
      totalDurationMs: submission.totalDurationMs,
      answerCount: submission.answerCount,
      building: submission.building,
      questionnaire: questionnaire.title,
      versionLabel: questionnaire.versionLabel,
      answers,
      telemetry: {
        totalEvents: submission.telemetryEvents,
        popupOpens: 3,
        answerChanges: 1,
        backtracks: 1,
        resumes: 0,
      },
    },
  }
}

function getJudicialRequests(): JudicialAccessRequestRecord[] {
  return readStorage(JUDICIAL_REQUESTS_STORAGE_KEY, createInitialJudicialRequests)
}

function saveJudicialRequests(requests: JudicialAccessRequestRecord[]): void {
  window.localStorage.setItem(JUDICIAL_REQUESTS_STORAGE_KEY, JSON.stringify(requests))
}

function createInitialJudicialRequests(): JudicialAccessRequestRecord[] {
  return [
    {
      id: 'demo-jar-001',
      requestReference: 'REQ-JUD-2026-001',
      legalBasisDescription: 'Réquisition fictive de démonstration : contrôle du workflow, sans données réelles.',
      courtOrderReference: 'ORD-DEMO-001',
      requestedPublicCodes: ['8F4K-29QX'],
      requestedBy: 'Service juridique · démonstration',
      receivedAt: addDaysIso(-1),
      dpoValidationUserId: null,
      legalValidationUserId: null,
      executedByUserId: null,
      status: 'received',
      executedAt: null,
      exportFingerprint: null,
      comments: 'Demande créée pour montrer la séparation coffre email / données métier.',
    },
  ]
}

function createJudicialRequest(payload: CreateJudicialAccessRequest): JudicialAccessRequestResponse {
  const requests = getJudicialRequests()
  const created: JudicialAccessRequestRecord = {
    id: createId('judicial-request'),
    requestReference: payload.requestReference || `REQ-JUD-${Date.now()}`,
    legalBasisDescription: payload.legalBasisDescription || 'Base légale à renseigner.',
    courtOrderReference: payload.courtOrderReference ?? null,
    requestedPublicCodes: payload.requestedPublicCodes.map((code) => code.trim().toUpperCase()).filter(Boolean),
    requestedBy: payload.requestedBy || 'Demandeur non renseigné',
    receivedAt: nowIso(),
    dpoValidationUserId: null,
    legalValidationUserId: null,
    executedByUserId: null,
    status: 'received',
    executedAt: null,
    exportFingerprint: null,
    comments: payload.comments ?? null,
  }
  requests.unshift(created)
  saveJudicialRequests(requests)
  appendAuditLog('judicial.request.created', 'JudicialAccessRequest', created.id, created.requestedPublicCodes[0] ?? null, {
    requestReference: created.requestReference,
    requestedPublicCodes: created.requestedPublicCodes,
    directEmailVisible: false,
    simulation: true,
  })
  return { judicialRequest: created }
}

function updateJudicialRequest(id: string, action: string): JudicialAccessRequestResponse {
  const requests = getJudicialRequests()
  const request = requests.find((candidate) => candidate.id === id)
  const currentUser = safeCurrentUser()

  if (!request) {
    throw new Error('Demande judiciaire introuvable.')
  }

  if (action === 'validate-dpo') {
    request.dpoValidationUserId = `demo-user-${currentUser?.role ?? 'dpo'}`
    request.status = request.legalValidationUserId ? 'validated' : 'received'
  }

  if (action === 'validate-legal') {
    request.legalValidationUserId = `demo-user-${currentUser?.role ?? 'judicial_officer'}`
    request.status = request.dpoValidationUserId ? 'validated' : 'received'
  }

  if (action === 'reject') {
    request.status = 'rejected'
  }

  if (action === 'execute') {
    if (request.status !== 'validated') throw new Error('Double validation requise avant exécution.')
    request.status = 'executed'
    request.executedAt = nowIso()
    request.executedByUserId = `demo-user-${currentUser?.role ?? 'judicial_officer'}`
    request.exportFingerprint = `demo-sha256-${Math.random().toString(16).slice(2).padEnd(16, '0')}`
  }

  if (action === 'close') {
    request.status = 'closed'
  }

  saveJudicialRequests(requests)
  appendAuditLog(`judicial.request.${action}`, 'JudicialAccessRequest', request.id, request.requestedPublicCodes[0] ?? null, {
    requestReference: request.requestReference,
    status: request.status,
    directEmailVisible: false,
    simulation: true,
  })

  return {
    judicialRequest: request,
    ...(action === 'execute' ? {
      encryptedExport: {
        algorithm: 'aes-256-gcm',
        keyRef: 'demo:JUDICIAL_EXPORT_KEY_B64',
        iv: 'demo-iv',
        authTag: 'demo-auth-tag',
        ciphertext: 'demo-export-chiffre-sans-email-en-clair-dans-interface',
        fingerprint: request.exportFingerprint ?? 'demo-fingerprint',
        expiresInMinutes: 15,
        warning: 'Export fictif chiffré : aucun email en clair n’est affiché dans l’interface de démonstration.',
      },
    } : {}),
  }
}

function getIdentityVaultStatus(): IdentityVaultStatusResponse {
  const currentUser = safeCurrentUser()
  return {
    status: {
      operationalSchema: 'public',
      identitySchema: 'identity',
      identityTable: 'identity.email_identities',
      model: 'IdentityVaultEntry',
      directEmailVisibleInAdmin: false,
      currentRole: currentUser?.role ?? 'respondent',
      currentRoleCanExecuteEmailAccess: currentUser?.role === 'judicial_officer',
      accessMode: 'workflow judiciaire uniquement, double validation DPO + juridique',
      audit: ['AuditLog', 'IdentityVaultAuditLog'],
    },
  }
}

function recordIdentityVaultAccessAttempt(payload: { publicCode?: string; justification?: string }): { accepted: boolean; message: string } {
  const currentUser = safeCurrentUser()
  if (currentUser?.role !== 'judicial_officer') {
    appendAuditLog('identity.vault.access.denied', 'IdentityVaultEntry', null, payload.publicCode ?? null, {
      role: currentUser?.role ?? 'inconnu',
      justification: payload.justification ?? null,
      directEmailVisible: false,
      simulation: true,
    })
    throw new Error(`Accès coffre refusé et journalisé pour le rôle ${currentUser?.role ?? 'inconnu'} sur ${payload.publicCode ?? 'code non fourni'}.`)
  }

  appendAuditLog('identity.vault.access.workflow_routed', 'IdentityVaultEntry', null, payload.publicCode ?? null, {
    justification: payload.justification ?? null,
    directEmailVisible: false,
    simulation: true,
  })

  return {
    accepted: true,
    message: 'Tentative routée vers le workflow JudicialAccessRequest. Aucun email direct n’est renvoyé.',
  }
}

function question(
  id: string,
  code: string,
  displayOrder: number,
  label: string,
  responseType: QuestionType,
  options: {
    required?: boolean
    helperText?: string
    options?: Array<[string, string]>
    likert?: ApiLikertScale
    popups?: ApiPopupDefinition[]
  } = {},
): ApiQuestion {
  return {
    id,
    code,
    title: label,
    label,
    type: responseType,
    responseType,
    displayOrder,
    isRequired: options.required ?? false,
    helperText: options.helperText ?? null,
    answerScaleLabel: responseType === 'likert' ? 'Échelle de Likert' : 'Réponse',
    likertScale: options.likert ?? null,
    options: options.options?.map(([value, optionLabel], index) => ({
      id: `${id}-option-${index + 1}`,
      value,
      label: optionLabel,
      displayOrder: index + 1,
    })) ?? [],
    popupDefinitions: options.popups ?? [],
  }
}

function itqQuestion(
  code: string,
  displayOrder: number,
  label: string,
  helperText: string,
  scale: ApiLikertScale,
  popupTitle: string,
  popupBody: string,
): ApiQuestion {
  return question(`demo-q-itq-${code.toLowerCase()}`, code, displayOrder, label, 'likert', {
    required: true,
    helperText,
    likert: scale,
    popups: [popup(`itq_${code.toLowerCase()}`, popupTitle, popupBody)],
  })
}

function likert(points: number, leftAnchor: string, rightAnchor: string, neutralLabel: string, minValue = 1): ApiLikertScale {
  return {
    id: createId('likert'),
    points,
    minValue,
    leftAnchor,
    rightAnchor,
    neutralLabel,
    allowNotApplicable: false,
    orientation: 'horizontal',
  }
}

function createLikertScale(payload: { points: number; minValue?: number; leftAnchor: string; rightAnchor: string; neutralLabel?: string; allowNotApplicable?: boolean }): ApiLikertScale {
  return {
    id: createId('likert'),
    points: payload.points,
    minValue: payload.minValue ?? 1,
    leftAnchor: payload.leftAnchor,
    rightAnchor: payload.rightAnchor,
    neutralLabel: payload.neutralLabel ?? null,
    allowNotApplicable: payload.allowNotApplicable ?? false,
    orientation: 'horizontal',
  }
}

function popup(termKey: string, title: string, body: string): ApiPopupDefinition {
  return {
    id: `demo-popup-${termKey}`,
    termKey,
    language: 'fr',
    title,
    body,
    version: '1.0',
    termLabel: title,
  }
}

function createPopupDefinition(title: string, body: string): ApiPopupDefinition {
  return popup(normalizeCode(title).toLowerCase(), title, body)
}

function createRespondentLink(token: string): string {
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`

  if (import.meta.env.VITE_ROUTER_MODE === 'hash') {
    return `${window.location.origin}${normalizedBasePath}#/r/${encodeURIComponent(token)}`
  }

  return `${window.location.origin}${normalizedBasePath}r/${encodeURIComponent(token)}`
}

function maskEmail(email: string): string {
  const [localPart = '', domain = 'domaine.org'] = email.split('@')
  const first = localPart[0] ?? 'x'
  return `${first}***@${domain}`
}

function isPotentiallyIdentifying(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /@|\b\d{2}[ .-]?\d{2}[ .-]?\d{2}[ .-]?\d{2}\b/.test(value)
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'QUESTION'
}

function createId(prefix: string): string {
  return `demo-${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function addDaysIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}
