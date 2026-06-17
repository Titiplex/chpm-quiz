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
  AuthResponse,
  AuthUserProfile,
  BuildingsResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateQuestionGroupRequest,
  CreateQuestionnaireRequest,
  CreateQuestionRequest,
  InvitationsResponse,
  QuestionnaireResponse,
  QuestionnairesResponse,
  RespondentAnswer,
  RespondentQuestion,
  RespondentSessionResponse,
  SaveAnswersRequest,
  SaveAnswersResponse,
  StatsResponse,
  SubmitResponse,
  UpdateQuestionGroupRequest,
  UpdateQuestionnaireRequest,
  UpdateQuestionRequest,
} from '@shared/types/api'

interface DemoRequestOptions {
  body?: object | Array<unknown>
}

const SESSION_EMAIL_STORAGE_KEY = 'chpm_demo_session_email'
const QUESTIONNAIRES_STORAGE_KEY = 'chpm_demo_questionnaires'
const INVITATIONS_STORAGE_KEY = 'chpm_demo_invitations'
const RESPONDENT_SESSIONS_STORAGE_KEY = 'chpm_demo_respondent_sessions'

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

  const statsMatch = route.match(/^\/stats\/questionnaires\/([^/]+)$/)
  if (statsMatch?.[1] && method === 'GET') {
    return asResponse<T>({ stats: createStats(statsMatch[1]) } satisfies StatsResponse)
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

  return {
    [CHPM_TOKEN]: createRespondentSession(CHPM_TOKEN, chpm, building, 'PEND-0001', 'draft'),
    [ITQ_TOKEN]: createRespondentSession(ITQ_TOKEN, itq, building, 'ITQ-0001', 'draft'),
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

function createStats(questionnaireId: string): StatsResponse['stats'] {
  const questionnaire = getQuestionnaires().find((candidate) => candidate.id === questionnaireId) ?? getQuestionnaires()[0]

  if (!questionnaire) {
    throw new Error('Questionnaire introuvable pour les statistiques de démonstration.')
  }

  const questions = questionnaire.groups.flatMap((group) => group.questions)

  return {
    questionnaire: { id: questionnaire.id, code: questionnaire.code, title: questionnaire.title },
    threshold: 5,
    totals: {
      invited: 8,
      started: 7,
      submitted: 6,
      abandoned: 0,
      expired: 0,
      completionRate: 75,
      telemetryEvents: 30,
      popupOpens: questionnaire.code === 'ITQ-CN2R' ? 42 : 9,
      answerChanges: 7,
      backtracks: 3,
      resumes: 3,
      medianTotalDurationMs: questionnaire.code === 'ITQ-CN2R' ? 9 * 60 * 1000 : 4 * 60 * 1000,
    },
    versions: [
      {
        id: questionnaire.versionId,
        versionLabel: questionnaire.versionLabel,
        status: questionnaire.status,
        invited: 8,
        started: 7,
        submitted: 6,
        completionRate: 75,
        effectifSufficient: true,
      },
    ],
    buildings: [
      {
        buildingId: 'demo-building-mtl-a',
        label: 'Montréal · Bâtiment A',
        invited: 8,
        started: 7,
        submitted: 6,
        effectifSufficient: true,
        completionRate: 75,
        displayValue: '75 %',
      },
      {
        buildingId: 'demo-building-par-c',
        label: 'Paris · Bâtiment C',
        invited: null,
        started: null,
        submitted: null,
        effectifSufficient: false,
        completionRate: null,
        displayValue: 'effectif insuffisant',
      },
    ],
    questions: questions.slice(0, 12).map((questionItem, index) => ({
      id: questionItem.id,
      code: questionItem.code,
      label: questionItem.label ?? questionItem.title,
      responseType: questionItem.responseType ?? questionItem.type,
      answerCount: index < 10 ? 6 : null,
      popupOpens: questionItem.popupDefinitions?.length ? 6 + index : index % 3 === 0 ? 2 : null,
      popupOpenRate: questionItem.popupDefinitions?.length ? 86 : null,
      responseChanges: index % 2 === 0 ? 1 : null,
      backtracks: index % 5 === 0 ? 1 : null,
      medianDurationMs: 35_000 + index * 4_000,
      highMedianDuration: index % 4 === 0,
      popupOftenOpened: Boolean(questionItem.popupDefinitions?.length),
      difficultQuestion: index % 4 === 0 || Boolean(questionItem.popupDefinitions?.length),
      difficultyLabels: questionItem.popupDefinitions?.length ? ['popup fréquente'] : index % 4 === 0 ? ['temps élevé'] : [],
      effectifSufficient: index < 10,
      displayValue: index < 10 ? 'affiché' : 'effectif insuffisant',
    })),
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
