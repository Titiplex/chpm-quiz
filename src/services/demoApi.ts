import { roleProfiles, type UserRole } from '@shared/types/rbac'
import type { AssistanceMode, InvitationDeliveryMode, InvitationStatus, QuestionType, SubmissionStatus } from '@shared/types/domain'
import type {
  ApiBuilding,
  ApiInvitation,
  ApiLikertScale,
  ApiPopupDefinition,
  ApiQuestion,
  ApiQuestionnaire,
  ApiNotificationSubscription,
  ApiTerminalDevice,
  AuthResponse,
  AuthUserProfile,
  BuildingsResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  OpenTerminalInvitationResponse,
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
  RegisterTerminalDeviceRequest,
  RegisterTerminalDeviceResponse,
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
  TerminalDevicesResponse,
  TerminalDeviceMutationResponse,
  TerminalSessionResponse,
  SubmitResponse,
  UpdateQuestionGroupRequest,
  UpdateQuestionnaireRequest,
  TechnicalRegisterResponse,
  UpdateQuestionRequest,
  UpdateTerminalDeviceRequest,
  RegenerateTerminalDeviceTokenResponse,
  ApiSite,
  ApiSiteTeamUser,
  AddQuestionnaireLanguageRequest,
  AddQuestionnaireLanguageResponse,
  BuildingMutationResponse,
  CreateBuildingRequest,
  CreateSiteRequest,
  SiteMutationResponse,
  ApiSiteAdminUser,
  CreateSiteAdminRequest,
  CreateSiteModeratorRequest,
  RevokeSessionsResponse,
  SiteAdminMutationResponse,
  SiteAdminsResponse,
  SiteModeratorMutationResponse,
  SitesResponse,
  SiteTeamResponse,
  UpdateSiteAdminRequest,
  UpdateSiteModeratorRequest,
  UpsertNotificationSubscriptionRequest,
} from '@shared/types/api'

interface DemoRequestOptions {
  body?: object | Array<unknown>
}

const SESSION_EMAIL_STORAGE_KEY = 'chpm_demo_session_email'
const DEMO_USERS_STORAGE_KEY = 'chpm_demo_users'
const DEMO_SITES_STORAGE_KEY = 'chpm_demo_sites'
const DEMO_BUILDINGS_STORAGE_KEY = 'chpm_demo_buildings'
const QUESTIONNAIRES_STORAGE_KEY = 'chpm_demo_questionnaires'
const INVITATIONS_STORAGE_KEY = 'chpm_demo_invitations'
const RESPONDENT_SESSIONS_STORAGE_KEY = 'chpm_demo_respondent_sessions'
const TERMINAL_DEVICES_STORAGE_KEY = 'chpm_demo_terminal_devices'
const JUDICIAL_REQUESTS_STORAGE_KEY = 'chpm_demo_judicial_requests'
const NOTIFICATION_SUBSCRIPTIONS_STORAGE_KEY = 'chpm_demo_notification_subscriptions'
const AUDIT_LOGS_STORAGE_KEY = 'chpm_demo_audit_logs'

interface DemoUserSeed {
  id?: string
  email: string
  password: string
  displayName: string
  role: Exclude<UserRole, 'respondent' | 'service_account'>
  buildingId?: string
  siteId?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
}

type RespondentSessionMap = Record<string, RespondentSessionResponse>

type JsonRecord = Record<string, unknown>

const DEMO_ORGANIZATION_ID = 'demo-org-chpm'
const CHPM_VERSION_ID = 'demo-version-chpm-1-4'
const ITQ_VERSION_ID = 'demo-version-itq-1-0-cn2r'
const LEC5_VERSION_ID = 'demo-version-lec5-1-0-papier'
const CHPM_TOKEN = 'demo-chpm-open'
const ITQ_TOKEN = 'demo-itq-open'
const LEC5_TOKEN = 'demo-lec5-open'


const lec5ExposureOptions: Array<[string, string]> = [
  ['happened_to_me', 'Ce m’est arrivé'],
  ['witnessed_it', 'J’en ai été témoin'],
  ['learned_about_it', 'Je l’ai appris'],
  ['part_of_work', 'Dans le cadre du travail'],
  ['not_applicable', 'Ne s’applique pas'],
  ['not_sure', 'Je ne suis pas sûr'],
]

const lec5Events: Array<{ code: string; label: string }> = [
  { code: 'LEC5-E01', label: '1. Catastrophe naturelle (inondation, ouragan, tornade, tremblement de terre, etc.)' },
  { code: 'LEC5-E02', label: '2. Incendie ou explosion' },
  { code: 'LEC5-E03', label: '3. Accident de la route (voiture, bateau, déraillement de train, écrasement d’avion, etc.)' },
  { code: 'LEC5-E04', label: '4. Accident grave au travail, à domicile ou pendant des loisirs' },
  { code: 'LEC5-E05', label: '5. Exposition à une substance toxique (produits chimiques dangereux, radiation, etc.)' },
  { code: 'LEC5-E06', label: '6. Agression physique (attaqué, frappé, poignardé, battu, coups de pied, etc.)' },
  { code: 'LEC5-E07', label: '7. Attaque à main armée (menacé ou blessé par une arme à feu, un couteau, une bombe, etc.)' },
  { code: 'LEC5-E08', label: '8. Agression sexuelle (viol, tentative, acte sexuel par la force ou sous menaces)' },
  { code: 'LEC5-E09', label: '9. Autre expérience sexuelle non désirée et désagréable (abus sexuel dans l’enfance)' },
  { code: 'LEC5-E10', label: '10. Conflit armé ou présence en zone de guerre (dans l’armée ou comme civil)' },
  { code: 'LEC5-E11', label: '11. Captivité (kidnappé, enlevé, pris en otage, incarcéré comme prisonnier de guerre, etc.)' },
  { code: 'LEC5-E12', label: '12. Maladie ou blessure mettant la vie en danger' },
  { code: 'LEC5-E13', label: '13. Souffrances humaines intenses' },
  { code: 'LEC5-E14', label: '14. Mort violente (homicide, suicide, etc.)' },
  { code: 'LEC5-E15', label: '15. Mort subite et accidentelle' },
  { code: 'LEC5-E16', label: '16. Blessure grave, dommage ou mort causé par vous à quelqu’un' },
  { code: 'LEC5-E17', label: '17. Toute autre expérience très stressante (négligence sévère dans l’enfance, etc.)' },
]

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

const terminalTokenSeeds: Record<string, string> = {
  'demo-terminal-mtl-accueil': 'demo-terminal-mtl-accueil-token',
  'demo-terminal-mtl-salle': 'demo-terminal-mtl-salle-token',
  'demo-terminal-par-accueil': 'demo-terminal-par-accueil-token',
}

const terminalDeviceSeeds: ApiTerminalDevice[] = [
  {
    id: 'demo-terminal-mtl-accueil',
    code: 'TERM-MTL-A-ACCUEIL',
    label: 'Tablette accueil · Montréal A',
    status: 'active',
    building: buildingSeeds[0]!,
    lastSeenAt: addMinutesIso(-18),
    pendingInvitationCount: 1,
  },
  {
    id: 'demo-terminal-mtl-salle',
    code: 'TERM-MTL-A-SALLE',
    label: 'Borne salle commune · Montréal A',
    status: 'active',
    building: buildingSeeds[0]!,
    lastSeenAt: addMinutesIso(-44),
    pendingInvitationCount: 0,
  },
  {
    id: 'demo-terminal-par-accueil',
    code: 'TERM-PAR-C-ACCUEIL',
    label: 'Tablette accueil · Paris C',
    status: 'active',
    building: buildingSeeds[1]!,
    lastSeenAt: null,
    pendingInvitationCount: 0,
  },
]

const demoUsers: DemoUserSeed[] = [
  {
    id: 'demo-user-admin',
    email: 'admin@chpm.local',
    password: 'Admin123!',
    displayName: 'Alice Martin',
    role: 'admin',
  },
  {
    id: 'demo-user-site-manager-mtl',
    email: 'site.manager@chpm.local',
    password: 'SiteManager123!',
    displayName: 'Sophie Responsable de site',
    role: 'site_manager',
    siteId: 'demo-site-mtl',
  },
  {
    id: 'demo-user-moderator-mtl-a',
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    displayName: 'Marc Dubois',
    role: 'moderator',
    buildingId: 'demo-building-mtl-a',
    siteId: 'demo-site-mtl',
  },
  {
    id: 'demo-user-questionnaire-admin',
    email: 'questionnaire.admin@chpm.local',
    password: 'Questionnaire123!',
    displayName: 'Quentin Questionnaires',
    role: 'questionnaire_admin',
  },
  {
    id: 'demo-user-analyst',
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    displayName: 'Nadia Bernard',
    role: 'analyst',
  },
  {
    id: 'demo-user-judicial',
    email: 'judiciaire@chpm.local',
    password: 'Judiciaire123!',
    displayName: 'Julie Accès judiciaire',
    role: 'judicial_officer',
  },
  {
    id: 'demo-user-tech',
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


  if (method === 'GET' && route === '/admin/sites') {
    return asResponse<T>({ sites: getDemoSites() } satisfies SitesResponse)
  }

  if (method === 'POST' && route === '/admin/sites') {
    return asResponse<T>(createSite(options.body as CreateSiteRequest) satisfies SiteMutationResponse)
  }

  if (method === 'GET' && route === '/admin/site-admins') {
    return asResponse<T>(getSiteAdmins() satisfies SiteAdminsResponse)
  }

  if (method === 'POST' && route === '/admin/site-admins') {
    return asResponse<T>(upsertSiteAdmin(options.body as CreateSiteAdminRequest) satisfies SiteAdminMutationResponse)
  }

  const siteAdminMatch = route.match(/^\/admin\/site-admins\/([^/]+)$/)
  if (siteAdminMatch?.[1] && method === 'PATCH') {
    return asResponse<T>(updateSiteAdmin(siteAdminMatch[1], options.body as UpdateSiteAdminRequest) satisfies SiteAdminMutationResponse)
  }

  const siteAdminResetMatch = route.match(/^\/admin\/site-admins\/([^/]+)\/reset-password$/)
  if (siteAdminResetMatch?.[1] && method === 'POST') {
    return asResponse<T>(resetSiteAdminPassword(siteAdminResetMatch[1]) satisfies SiteAdminMutationResponse)
  }

  const siteAdminRevokeMatch = route.match(/^\/admin\/site-admins\/([^/]+)\/revoke-sessions$/)
  if (siteAdminRevokeMatch?.[1] && method === 'POST') {
    return asResponse<T>(revokeSiteAdminSessions(siteAdminRevokeMatch[1]) satisfies RevokeSessionsResponse)
  }

  if ((method === 'GET' && route === '/site/team') || (method === 'GET' && route === '/users/site-team')) {
    return asResponse<T>(getSiteTeam() satisfies SiteTeamResponse)
  }

  if ((method === 'POST' && route === '/site/moderators') || (method === 'POST' && route === '/users/site-moderators')) {
    return asResponse<T>(upsertSiteModerator(options.body as CreateSiteModeratorRequest) satisfies SiteModeratorMutationResponse)
  }

  const siteModeratorMatch = route.match(/^\/(?:site\/moderators|users\/site-moderators)\/([^/]+)$/)
  if (siteModeratorMatch?.[1] && method === 'PATCH') {
    return asResponse<T>(updateSiteModerator(siteModeratorMatch[1], options.body as UpdateSiteModeratorRequest) satisfies SiteModeratorMutationResponse)
  }

  const siteModeratorResetMatch = route.match(/^\/(?:site\/moderators|users\/site-moderators)\/([^/]+)\/reset-password$/)
  if (siteModeratorResetMatch?.[1] && method === 'POST') {
    return asResponse<T>(resetSiteModeratorPassword(siteModeratorResetMatch[1]) satisfies SiteModeratorMutationResponse)
  }

  const siteModeratorRevokeMatch = route.match(/^\/(?:site\/moderators|users\/site-moderators)\/([^/]+)\/revoke-sessions$/)
  if (siteModeratorRevokeMatch?.[1] && method === 'POST') {
    return asResponse<T>(revokeSiteModeratorSessions(siteModeratorRevokeMatch[1]) satisfies RevokeSessionsResponse)
  }

  if (method === 'GET' && route === '/buildings') {
    return asResponse<T>({ buildings: getVisibleBuildings() } satisfies BuildingsResponse)
  }

  if ((method === 'POST' && route === '/site/buildings') || (method === 'POST' && route === '/buildings')) {
    return asResponse<T>(createBuilding(options.body as CreateBuildingRequest) satisfies BuildingMutationResponse)
  }

  if (method === 'GET' && route === '/questionnaires') {
    return asResponse<T>({ questionnaires: getVisibleQuestionnaires() } satisfies QuestionnairesResponse)
  }

  if (method === 'POST' && route === '/questionnaires') {
    return asResponse<T>(createQuestionnaire(options.body as CreateQuestionnaireRequest))
  }

  const translationMatch = route.match(/^\/questionnaires\/([^/]+)\/translations$/)
  if (translationMatch?.[1] && method === 'POST') {
    return asResponse<T>(addQuestionnaireLanguage(translationMatch[1], options.body as AddQuestionnaireLanguageRequest) satisfies AddQuestionnaireLanguageResponse)
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


  if (method === 'GET' && route === '/terminal-devices') {
    return asResponse<T>({ terminalDevices: getTerminalDevicesWithCounts() } satisfies TerminalDevicesResponse)
  }

  if (method === 'POST' && route === '/terminal-devices') {
    return asResponse<T>(registerTerminalDevice(options.body as RegisterTerminalDeviceRequest) satisfies RegisterTerminalDeviceResponse)
  }

  const terminalDeviceMatch = route.match(/^\/terminal-devices\/([^/]+)$/)
  if (terminalDeviceMatch?.[1] && method === 'PATCH') {
    return asResponse<T>(updateTerminalDevice(terminalDeviceMatch[1], options.body as UpdateTerminalDeviceRequest) satisfies TerminalDeviceMutationResponse)
  }

  const terminalDeviceRevokeMatch = route.match(/^\/terminal-devices\/([^/]+)\/revoke$/)
  if (terminalDeviceRevokeMatch?.[1] && method === 'POST') {
    return asResponse<T>(revokeTerminalDevice(terminalDeviceRevokeMatch[1]) satisfies TerminalDeviceMutationResponse)
  }

  const terminalDeviceRegenerateMatch = route.match(/^\/terminal-devices\/([^/]+)\/regenerate-token$/)
  if (terminalDeviceRegenerateMatch?.[1] && method === 'POST') {
    return asResponse<T>(regenerateTerminalToken(terminalDeviceRegenerateMatch[1]) satisfies RegenerateTerminalDeviceTokenResponse)
  }

  if (method === 'GET' && route === '/moderation/invitations') {
    return asResponse<T>({ invitations: getVisibleInvitations() } satisfies InvitationsResponse)
  }

  if (method === 'GET' && route === '/moderation/terminal-devices') {
    return asResponse<T>({ terminalDevices: getTerminalDevicesWithCounts() } satisfies TerminalDevicesResponse)
  }

  if (method === 'POST' && route === '/moderation/terminal-devices') {
    return asResponse<T>(registerTerminalDevice(options.body as RegisterTerminalDeviceRequest) satisfies RegisterTerminalDeviceResponse)
  }

  if (method === 'POST' && route === '/moderation/invitations') {
    return asResponse<T>(createInvitation(options.body as CreateInvitationRequest))
  }

  const resendMatch = route.match(/^\/moderation\/invitations\/([^/]+)\/resend$/)
  if (resendMatch?.[1] && method === 'POST') {
    return asResponse<T>(resendInvitation(resendMatch[1]))
  }

  if (method === 'GET' && route === '/terminal/session') {
    return asResponse<T>(getTerminalSession(requestUrl.searchParams.get('token') ?? '') satisfies TerminalSessionResponse)
  }

  const terminalOpenMatch = route.match(/^\/terminal\/invitations\/([^/]+)\/open$/)
  if (terminalOpenMatch?.[1] && method === 'POST') {
    return asResponse<T>(openTerminalInvitation(terminalOpenMatch[1], options.body as { terminalToken?: string }) satisfies OpenTerminalInvitationResponse)
  }

  if (method === 'GET' && route === '/respondent/session') {
    return asResponse<T>(getRespondentSession(requestUrl.searchParams.get('token') ?? '', requestUrl.searchParams.get('terminalToken') ?? undefined))
  }

  if (method === 'PUT' && route === '/respondent/answers') {
    return asResponse<T>(saveRespondentAnswers(options.body as SaveAnswersRequest))
  }

  if (method === 'POST' && route === '/respondent/telemetry') {
    return asResponse<T>({ ok: true })
  }

  if (method === 'POST' && route === '/respondent/submit') {
    return asResponse<T>(submitRespondentSession(options.body as { token?: string; terminalToken?: string }))
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
  const user = getDemoUsers().find((candidate) => candidate.email === email)

  if (!user) {
    throw new Error('Session de démonstration absente.')
  }

  return { user: toAuthUserProfile(user) }
}

function login(credentials: { email?: string; password?: string }): AuthResponse {
  const email = credentials.email?.trim().toLowerCase() ?? ''
  const user = getDemoUsers().find((candidate) => candidate.email === email && candidate.password === credentials.password && candidate.isActive !== false)

  if (!user) {
    throw new Error('Identifiants de démonstration invalides.')
  }

  window.localStorage.setItem(SESSION_EMAIL_STORAGE_KEY, user.email)
  return { user: toAuthUserProfile(user) }
}

function toAuthUserProfile(seed: DemoUserSeed): AuthUserProfile {
  const building = seed.buildingId ? getBuildings().find((candidate) => candidate.id === seed.buildingId) ?? null : null

  return {
    id: seed.id ?? `demo-user-${seed.role}`,
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
    return getBuildings().filter((building) => building.id === currentUser.buildingId)
  }

  if (currentUser?.role === 'site_manager' && currentUser.siteId) {
    return getBuildings().filter((building) => building.siteId === currentUser.siteId)
  }

  return getBuildings()
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
  return getDemoUsers().find((candidate) => candidate.email === email) ?? null
}

function getDemoUsers(): DemoUserSeed[] {
  return readStorage(DEMO_USERS_STORAGE_KEY, () => demoUsers)
}

function saveDemoUsers(users: DemoUserSeed[]): void {
  window.localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(users))
}



function requireSiteTeamManager(): DemoUserSeed {
  const currentUser = safeCurrentUser()
  if (!currentUser || currentUser.role !== 'site_manager') {
    throw new Error('Seul un responsable de site peut gérer une équipe de site.')
  }
  if (!currentUser.siteId) {
    throw new Error('Gestionnaire de site sans site affecté.')
  }
  return currentUser
}

function getSiteTeam(): SiteTeamResponse {
  const currentUser = requireSiteTeamManager()
  const users = getDemoUsers()
    .filter((user) => user.role === 'moderator')
    .filter((user) => isUserInSiteTeamScope(currentUser, user))
    .map(toApiSiteTeamUser)

  return {
    users,
    policy: {
      manageableRoles: ['moderator'],
      scope: 'site',
      passwordReturnedOnce: true,
    },
  }
}


function getDemoSites(): ApiSite[] {
  return readStorage(DEMO_SITES_STORAGE_KEY, createInitialSites)
}

function saveDemoSites(sites: ApiSite[]): void {
  window.localStorage.setItem(DEMO_SITES_STORAGE_KEY, JSON.stringify(sites))
}

function createInitialSites(): ApiSite[] {
  const siteIds = Array.from(new Set(buildingSeeds.map((building) => building.siteId).filter((siteId): siteId is string => Boolean(siteId))))
  return siteIds.map((siteId) => {
    const buildings = buildingSeeds.filter((building) => building.siteId === siteId)
    const firstBuilding = buildings[0]
    const code = siteId.replace('demo-site-', '').toUpperCase()
    return {
      id: siteId,
      code,
      name: firstBuilding?.label.split('·')[0]?.trim() ?? code,
      organizationId: DEMO_ORGANIZATION_ID,
      organization: { id: DEMO_ORGANIZATION_ID, code: 'CHPM', name: 'CH Montfavet' },
      country: firstBuilding?.country ?? null,
      timezone: firstBuilding?.timezone ?? null,
    }
  })
}

function createSite(payload: CreateSiteRequest): SiteMutationResponse {
  requireProjectAdmin()
  const sites = getDemoSites()
  const code = normalizeCode(payload.code || `SITE-${sites.length + 1}`)

  if (sites.some((site) => normalizeCode(site.code) === code)) {
    throw new Error('Ce code site existe déjà dans la démo.')
  }

  const site: ApiSite = {
    id: createId('site'),
    code,
    name: payload.name.trim(),
    organizationId: DEMO_ORGANIZATION_ID,
    organization: { id: DEMO_ORGANIZATION_ID, code: 'CHPM', name: 'CH Montfavet' },
    country: payload.country?.trim() || null,
    timezone: payload.timezone?.trim() || null,
  }

  sites.push(site)
  sites.sort((left, right) => left.name.localeCompare(right.name, 'fr'))
  saveDemoSites(sites)
  appendAuditLog('site.create', 'Site', site.id, null, { code: site.code, name: site.name })
  return { site }
}

function getBuildings(): ApiBuilding[] {
  return readStorage(DEMO_BUILDINGS_STORAGE_KEY, () => buildingSeeds)
}

function saveBuildings(buildings: ApiBuilding[]): void {
  window.localStorage.setItem(DEMO_BUILDINGS_STORAGE_KEY, JSON.stringify(buildings))
}

function createBuilding(payload: CreateBuildingRequest): BuildingMutationResponse {
  const currentUser = requireSiteTeamManager()
  const site = getDemoSites().find((candidate) => candidate.id === currentUser.siteId)
  if (!site) throw new Error('Site courant introuvable dans la démo.')

  const buildings = getBuildings()
  const code = normalizeCode(payload.code || `BAT-${buildings.length + 1}`)
  if (buildings.some((building) => normalizeCode(building.code) === code)) {
    throw new Error('Ce code bâtiment existe déjà dans la démo.')
  }

  const building: ApiBuilding = {
    id: createId('building'),
    code,
    label: payload.label.trim(),
    city: payload.city.trim(),
    country: payload.country.trim(),
    timezone: payload.timezone.trim(),
    organizationId: DEMO_ORGANIZATION_ID,
    siteId: site.id,
  }

  buildings.push(building)
  buildings.sort((left, right) => left.label.localeCompare(right.label, 'fr'))
  saveBuildings(buildings)
  appendAuditLog('building.create', 'Building', building.id, null, { code: building.code, siteId: site.id })
  return { building }
}

function requireProjectAdmin(): DemoUserSeed {
  const currentUser = safeCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Seul un administrateur projet peut gérer les responsables de site dans la démo.')
  }
  return currentUser
}

function getSiteAdmins(): SiteAdminsResponse {
  requireProjectAdmin()
  return {
    users: getDemoUsers().filter((user) => user.role === 'site_manager').map(toApiSiteAdminUser),
    policy: {
      manageableRoles: ['site_manager'],
      scope: 'project',
      passwordReturnedOnce: true,
      forbiddenRoles: ['admin', 'dpo', 'technical_admin', 'judicial_officer'],
    },
  }
}

function upsertSiteAdmin(payload: CreateSiteAdminRequest): SiteAdminMutationResponse {
  requireProjectAdmin()
  const site = getDemoSites().find((candidate) => candidate.id === payload.siteId)
  if (!site) throw new Error('Site introuvable dans la démo.')

  const users = getDemoUsers()
  const email = payload.email.trim().toLowerCase()
  const existingIndex = users.findIndex((candidate) => candidate.email === email)
  const existing = existingIndex >= 0 ? users[existingIndex] : undefined
  if (existing && existing.role !== 'site_manager') throw new Error('Cet email correspond déjà à un compte qui n’est pas responsable de site.')

  const temporaryPassword = payload.temporaryPassword ?? generateDemoTemporaryPassword()
  const now = nowIso()
  const nextUser: DemoUserSeed = {
    ...existing,
    id: existing?.id ?? createId('user-site-manager'),
    email,
    password: temporaryPassword,
    displayName: payload.displayName.trim(),
    role: 'site_manager',
    siteId: site.id,
    buildingId: undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isActive: true,
  }

  if (existingIndex >= 0) users[existingIndex] = nextUser
  else users.push(nextUser)
  saveDemoUsers(users)
  appendAuditLog('user.siteAdmin.create', 'User', nextUser.id ?? null, null, { email, siteId: site.id })
  return { user: toApiSiteAdminUser(nextUser), temporaryPassword, temporaryPasswordGenerated: payload.temporaryPassword === undefined }
}

function updateSiteAdmin(id: string, payload: UpdateSiteAdminRequest): SiteAdminMutationResponse {
  requireProjectAdmin()
  const users = getDemoUsers()
  const index = users.findIndex((candidate) => candidate.id === id)
  const user = index >= 0 ? users[index] : undefined
  if (!user || user.role !== 'site_manager') throw new Error('Responsable de site introuvable dans la démo.')
  if (payload.siteId && !getDemoSites().some((site) => site.id === payload.siteId)) throw new Error('Site introuvable dans la démo.')

  const updated: DemoUserSeed = {
    ...user,
    displayName: payload.displayName?.trim() || user.displayName,
    siteId: payload.siteId ?? user.siteId,
    buildingId: undefined,
    updatedAt: nowIso(),
  }
  if (payload.isActive !== undefined) updated.isActive = payload.isActive
  users[index] = updated
  saveDemoUsers(users)
  appendAuditLog('user.siteAdmin.patch', 'User', updated.id ?? null, null, { email: updated.email, siteId: updated.siteId, isActive: payload.isActive })
  return { user: toApiSiteAdminUser(updated) }
}

function resetSiteAdminPassword(id: string): SiteAdminMutationResponse {
  requireProjectAdmin()
  const users = getDemoUsers()
  const index = users.findIndex((candidate) => candidate.id === id)
  const user = index >= 0 ? users[index] : undefined
  if (!user || user.role !== 'site_manager') throw new Error('Responsable de site introuvable dans la démo.')
  const temporaryPassword = generateDemoTemporaryPassword()
  const updated: DemoUserSeed = { ...user, password: temporaryPassword, isActive: true, updatedAt: nowIso() }
  users[index] = updated
  saveDemoUsers(users)
  appendAuditLog('user.siteAdmin.resetPassword', 'User', updated.id ?? null, null, { email: updated.email })
  return { user: toApiSiteAdminUser(updated), temporaryPassword, temporaryPasswordGenerated: true }
}

function revokeSiteAdminSessions(id: string): RevokeSessionsResponse {
  requireProjectAdmin()
  const user = getDemoUsers().find((candidate) => candidate.id === id && candidate.role === 'site_manager')
  if (!user) throw new Error('Responsable de site introuvable dans la démo.')
  appendAuditLog('user.siteAdmin.revokeSessions', 'User', user.id ?? null, null, { email: user.email })
  return { user: toApiSiteAdminUser(user), revokedSessionCount: 1 }
}

function upsertSiteModerator(payload: CreateSiteModeratorRequest): SiteModeratorMutationResponse {
  const currentUser = requireSiteTeamManager()
  const building = getBuildings().find((candidate) => candidate.id === payload.buildingId)
  if (!building) throw new Error('Bâtiment introuvable dans la démo.')
  assertBuildingInCurrentUserScope(building)

  const users = getDemoUsers()
  const email = payload.email.trim().toLowerCase()
  const existingIndex = users.findIndex((candidate) => candidate.email === email)
  const existing = existingIndex >= 0 ? users[existingIndex] : undefined
  if (existing && existing.role !== 'moderator') {
    throw new Error('Cet email correspond déjà à un compte qui n’est pas modérateur.')
  }
  if (existing && !isUserInSiteTeamScope(currentUser, existing)) {
    throw new Error('Modérateur hors de votre périmètre.')
  }

  const temporaryPassword = payload.temporaryPassword ?? generateDemoTemporaryPassword()
  const now = nowIso()
  const nextUser: DemoUserSeed = {
    ...existing,
    id: existing?.id ?? createId('user-moderator'),
    email,
    password: temporaryPassword,
    displayName: payload.displayName.trim(),
    role: 'moderator',
    buildingId: building.id,
    siteId: building.siteId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    isActive: true,
  }

  if (existingIndex >= 0) {
    users[existingIndex] = nextUser
  } else {
    users.push(nextUser)
  }
  saveDemoUsers(users)
  appendAuditLog('user.siteModerator.create', 'User', nextUser.id ?? null, null, { email, buildingId: building.id })

  return {
    user: toApiSiteTeamUser(nextUser),
    temporaryPassword,
    temporaryPasswordGenerated: payload.temporaryPassword === undefined,
  }
}

function updateSiteModerator(id: string, payload: UpdateSiteModeratorRequest): SiteModeratorMutationResponse {
  const currentUser = requireSiteTeamManager()
  const users = getDemoUsers()
  const index = users.findIndex((candidate) => candidate.id === id)
  const user = index >= 0 ? users[index] : undefined
  if (!user || user.role !== 'moderator' || !isUserInSiteTeamScope(currentUser, user)) {
    throw new Error('Modérateur introuvable dans votre périmètre.')
  }

  let nextBuilding = user.buildingId ? getBuildings().find((candidate) => candidate.id === user.buildingId) : undefined
  if (payload.buildingId) {
    nextBuilding = getBuildings().find((candidate) => candidate.id === payload.buildingId)
    if (!nextBuilding) throw new Error('Bâtiment introuvable dans la démo.')
    assertBuildingInCurrentUserScope(nextBuilding)
  }

  const updated: DemoUserSeed = {
    ...user,
    displayName: payload.displayName?.trim() || user.displayName,
    buildingId: nextBuilding?.id ?? user.buildingId,
    siteId: nextBuilding?.siteId ?? user.siteId,
    updatedAt: nowIso(),
  }
  if (payload.isActive !== undefined) {
    updated.isActive = payload.isActive
  }
  if (payload.isActive === false) {
    updated.password = createId('disabled-password')
  }

  users[index] = updated
  saveDemoUsers(users)
  appendAuditLog('user.siteModerator.patch', 'User', updated.id ?? null, null, {
    email: updated.email,
    buildingId: updated.buildingId,
    isActive: payload.isActive,
  })

  return { user: toApiSiteTeamUser(updated) }
}

function resetSiteModeratorPassword(id: string): SiteModeratorMutationResponse {
  const currentUser = requireSiteTeamManager()
  const users = getDemoUsers()
  const index = users.findIndex((candidate) => candidate.id === id)
  const user = index >= 0 ? users[index] : undefined
  if (!user || user.role !== 'moderator' || !isUserInSiteTeamScope(currentUser, user)) {
    throw new Error('Modérateur introuvable dans votre périmètre.')
  }

  const temporaryPassword = generateDemoTemporaryPassword()
  const updated: DemoUserSeed = { ...user, password: temporaryPassword, isActive: true, updatedAt: nowIso() }
  users[index] = updated
  saveDemoUsers(users)
  appendAuditLog('user.siteModerator.resetPassword', 'User', updated.id ?? null, null, { email: updated.email })

  return { user: toApiSiteTeamUser(updated), temporaryPassword, temporaryPasswordGenerated: true }
}


function revokeSiteModeratorSessions(id: string): RevokeSessionsResponse {
  const currentUser = requireSiteTeamManager()
  const user = getDemoUsers().find((candidate) => candidate.id === id)
  if (!user || user.role !== 'moderator' || !isUserInSiteTeamScope(currentUser, user)) {
    throw new Error('Modérateur introuvable dans votre périmètre.')
  }
  appendAuditLog('user.siteModerator.revokeSessions', 'User', user.id ?? null, null, { email: user.email })
  return { user: toApiSiteTeamUser(user), revokedSessionCount: 1 }
}

function isUserInSiteTeamScope(currentUser: DemoUserSeed, user: DemoUserSeed): boolean {
  return currentUser.role === 'site_manager' && Boolean(currentUser.siteId) && user.siteId === currentUser.siteId
}

function toApiSiteTeamUser(seed: DemoUserSeed): ApiSiteTeamUser {
  const building = seed.buildingId ? getBuildings().find((candidate) => candidate.id === seed.buildingId) ?? null : null
  const siteId = seed.siteId ?? building?.siteId ?? null

  return {
    id: seed.id ?? `demo-user-${seed.role}`,
    email: seed.email,
    displayName: seed.displayName,
    role: seed.role as ApiSiteTeamUser['role'],
    roleLabel: roleProfiles[seed.role].label,
    isActive: seed.isActive ?? !seed.password.startsWith('demo-disabled-password'),
    organizationId: DEMO_ORGANIZATION_ID,
    siteId,
    buildingId: building?.id ?? null,
    site: siteId ? siteDto(siteId) : null,
    building,
    createdAt: seed.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-01-01T00:00:00.000Z',
  }
}


function toApiSiteAdminUser(seed: DemoUserSeed): ApiSiteAdminUser {
  return toApiSiteTeamUser(seed) as ApiSiteAdminUser
}

function siteDto(siteId: string): { id: string; code: string; name: string } {
  const firstBuilding = getBuildings().find((building) => building.siteId === siteId)
  const code = siteId.replace('demo-site-', '').toUpperCase()
  return {
    id: siteId,
    code,
    name: firstBuilding ? firstBuilding.label.split('·')[0]?.trim() ?? code : code,
  }
}

function generateDemoTemporaryPassword(): string {
  const suffix = crypto.randomUUID?.().slice(0, 8) ?? Math.random().toString(16).slice(2, 10)
  return `Temp-${suffix}-A7!x`
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

function getVisibleInvitations(): ApiInvitation[] {
  const currentUser = safeCurrentUser()
  const invitations = getInvitations()

  if (currentUser?.role === 'moderator' && currentUser.buildingId) {
    return invitations.filter((invitation) => invitation.building.id === currentUser.buildingId)
  }

  if (currentUser?.role === 'site_manager' && currentUser.siteId) {
    return invitations.filter((invitation) => invitation.building.siteId === currentUser.siteId)
  }

  return invitations
}

function saveInvitations(invitations: ApiInvitation[]): void {
  window.localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations))
}

function getTerminalDevices(): ApiTerminalDevice[] {
  return readStorage(TERMINAL_DEVICES_STORAGE_KEY, () => terminalDeviceSeeds)
}

function saveTerminalDevices(devices: ApiTerminalDevice[]): void {
  window.localStorage.setItem(TERMINAL_DEVICES_STORAGE_KEY, JSON.stringify(devices))
}

function getVisibleTerminalDevices(): ApiTerminalDevice[] {
  const currentUser = safeCurrentUser()
  const devices = getTerminalDevices()

  if (currentUser?.role === 'moderator' && currentUser.buildingId) {
    return devices.filter((device) => device.building.id === currentUser.buildingId)
  }

  if (currentUser?.role === 'site_manager' && currentUser.siteId) {
    return devices.filter((device) => device.building.siteId === currentUser.siteId)
  }

  return devices
}

function getTerminalDevicesWithCounts(): ApiTerminalDevice[] {
  const invitations = getVisibleInvitations()
  return getVisibleTerminalDevices().map((device) => ({
    ...device,
    pendingInvitationCount: invitations.filter((invitation) =>
      invitation.deliveryMode === 'onsite_terminal'
      && invitation.terminalDevice?.id === device.id
      && ['sent', 'opened', 'in_progress', 'draft'].includes(invitation.status)
      && new Date(invitation.expiresAt).getTime() > Date.now(),
    ).length,
  }))
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

function addQuestionnaireLanguage(questionnaireId: string, payload: AddQuestionnaireLanguageRequest): AddQuestionnaireLanguageResponse {
  const questionnaires = getQuestionnaires()
  const source = questionnaires.find((candidate) => candidate.id === questionnaireId)
  if (!source) throw new Error('Questionnaire source introuvable dans la démo.')

  const language = payload.language
  if (source.language === language) {
    throw new Error('Cette langue correspond déjà à la version courante.')
  }

  const codeRoot = source.code.replace(/-(FR|EN|ES)$/i, '')
  const code = normalizeCode(`${codeRoot}-${language.toUpperCase()}`)
  if (questionnaires.some((candidate) => candidate.code === code)) {
    throw new Error('Une traduction avec ce code existe déjà dans la démo.')
  }

  const questionnaire: ApiQuestionnaire = {
    ...clone(source),
    id: createId('questionnaire'),
    code,
    title: payload.title?.trim() || `${source.title} (${language.toUpperCase()})`,
    description: payload.description?.trim() || source.description,
    defaultLanguage: language,
    versionId: createId('version'),
    version: '0.1',
    versionLabel: `0.1-${language}-draft`,
    language,
    finality: payload.finality?.trim() || source.finality,
    status: 'draft',
    isPublished: false,
    groups: source.groups.map((group, groupIndex) => ({
      ...clone(group),
      id: createId('group'),
      displayOrder: groupIndex + 1,
      questions: group.questions.map((question, questionIndex) => ({
        ...clone(question),
        id: createId('question'),
        title: markTextForTranslation(question.title, language),
        label: markTextForTranslation(question.label ?? question.title, language),
        helperText: question.helperText ? markTextForTranslation(question.helperText, language) : question.helperText,
        displayOrder: questionIndex + 1,
        likertScale: question.likertScale
          ? { ...clone(question.likertScale), id: createId('likert') }
          : null,
        options: question.options?.map((option, optionIndex) => ({
          ...clone(option),
          id: createId('option'),
          label: markTextForTranslation(option.label, language),
          displayOrder: optionIndex + 1,
        })) ?? [],
        popupDefinitions: question.popupDefinitions?.map((popup) => ({
          ...clone(popup),
          id: createId('popup'),
          language,
          title: markTextForTranslation(popup.title, language),
          body: markTextForTranslation(popup.body, language),
        })) ?? [],
      })),
    })),
  }

  recomputeQuestionnaireCounters(questionnaire)
  questionnaires.unshift(questionnaire)
  saveQuestionnaires(questionnaires)
  appendAuditLog('questionnaire.translation.create', 'Questionnaire', questionnaire.id, null, {
    sourceQuestionnaireId: source.id,
    language,
    code,
  })
  return { questionnaire }
}

function markTextForTranslation(value: string, language: string): string {
  const marker = `[${language.toUpperCase()} à traduire]`
  return value.startsWith(marker) ? value : `${marker} ${value}`
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


function assertBuildingInCurrentUserScope(building: ApiBuilding): void {
  const currentUser = safeCurrentUser()

  if (currentUser?.role === 'moderator' && currentUser.buildingId !== building.id) {
    throw new Error('Le bâtiment sélectionné est hors de votre périmètre de modération.')
  }

  if (currentUser?.role === 'site_manager' && currentUser.siteId !== building.siteId) {
    throw new Error('Le bâtiment sélectionné est hors de votre site.')
  }
}

function assertCanAdministerTerminalInDemo(building: ApiBuilding): void {
  const currentUser = safeCurrentUser()

  if (!currentUser || !['admin', 'site_manager', 'technical_admin'].includes(currentUser.role)) {
    throw new Error('Votre rôle ne permet pas d’administrer les terminaux.')
  }

  assertBuildingInCurrentUserScope(building)
}

function createInvitation(payload: CreateInvitationRequest): CreateInvitationResponse {
  const questionnaires = getQuestionnaires()
  const questionnaire = questionnaires.find((candidate) => candidate.versionId === payload.questionnaireVersionId)
  const building = getBuildings().find((candidate) => candidate.id === payload.buildingId)

  if (!questionnaire || !building) {
    throw new Error('Questionnaire ou bâtiment de démonstration introuvable.')
  }

  assertBuildingInCurrentUserScope(building)

  const deliveryMode: InvitationDeliveryMode = payload.deliveryMode ?? 'email_simulation'
  const assistanceMode: AssistanceMode = payload.assistanceMode ?? 'none'
  const terminalDevice = payload.terminalDeviceId
    ? getTerminalDevices().find((candidate) => candidate.id === payload.terminalDeviceId) ?? null
    : null

  if (deliveryMode === 'onsite_terminal') {
    if (!terminalDevice) throw new Error('Terminal de démonstration introuvable.')
    if (terminalDevice.building.id !== building.id) throw new Error('Le terminal choisi est hors du bâtiment sélectionné.')
  } else if (!payload.email) {
    throw new Error('Adresse email requise pour une invitation email.')
  }

  const invitations = getInvitations()
  const publicCode = deliveryMode === 'onsite_terminal'
    ? `TERM-${String(invitations.length + 1).padStart(4, '0')}`
    : `DEMO-${String(invitations.length + 1).padStart(4, '0')}`
  const token = `demo-${publicCode.toLowerCase()}-${crypto.randomUUID()}`
  const invitation: ApiInvitation = {
    id: createId('invitation'),
    publicCode,
    status: 'sent',
    deliveryMode,
    assistanceMode,
    maskedEmail: deliveryMode === 'onsite_terminal' ? null : maskEmail(payload.email),
    questionnaireVersionId: payload.questionnaireVersionId,
    questionnaireTitle: questionnaire.title,
    versionLabel: questionnaire.versionLabel,
    building,
    terminalDevice,
    terminalDispatchedAt: deliveryMode === 'onsite_terminal' ? nowIso() : null,
    expiresAt: payload.expiresAt ?? addDaysIso(deliveryMode === 'onsite_terminal' ? 1 : 30),
    sentAt: nowIso(),
    openedAt: null,
    startedAt: null,
    submittedAt: null,
    responseStatus: null,
  }

  invitations.unshift(invitation)
  saveInvitations(invitations)

  if (deliveryMode !== 'onsite_terminal') {
    const sessions = getRespondentSessions()
    sessions[token] = createRespondentSession(token, questionnaire, building, publicCode, 'draft', invitation)
    saveRespondentSessions(sessions)
  }

  return {
    invitation,
    accessToken: deliveryMode === 'onsite_terminal' ? null : token,
    devAccessLink: deliveryMode === 'onsite_terminal' ? null : createRespondentLink(token),
    terminalDispatchLink: terminalDevice ? createTerminalLink(terminalTokenSeeds[terminalDevice.id] ?? '') : null,
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

function registerTerminalDevice(payload: RegisterTerminalDeviceRequest): RegisterTerminalDeviceResponse {
  const building = getBuildings().find((candidate) => candidate.id === payload.buildingId)
  if (!building) throw new Error('Bâtiment introuvable pour créer le terminal.')

  assertCanAdministerTerminalInDemo(building)

  const devices = getTerminalDevices()
  const id = createId('terminal')
  const code = `TERM-${building.code}-${String(devices.length + 1).padStart(2, '0')}`
  const token = `${id}-token`
  const terminalDevice: ApiTerminalDevice = {
    id,
    code,
    label: payload.label || `Terminal ${building.label}`,
    status: 'active',
    building,
    lastSeenAt: null,
    pendingInvitationCount: 0,
  }

  terminalTokenSeeds[id] = token
  devices.unshift(terminalDevice)
  saveTerminalDevices(devices)
  appendAuditLog('terminal_device.register', 'TerminalDevice', id, null, {
    buildingId: building.id,
    code,
    simulation: true,
  })

  return {
    terminalDevice,
    terminalAccessToken: token,
    terminalLaunchLink: createTerminalLink(token),
  }
}


function updateTerminalDevice(terminalDeviceId: string, payload: UpdateTerminalDeviceRequest): { terminalDevice: ApiTerminalDevice } {
  const devices = getTerminalDevices()
  const index = devices.findIndex((candidate) => candidate.id === terminalDeviceId)
  if (index < 0) throw new Error('Terminal introuvable dans la démo.')

  const existing = devices[index]!
  assertCanAdministerTerminalInDemo(existing.building)
  const updated: ApiTerminalDevice = {
    ...existing,
    label: payload.label?.trim() || existing.label,
    status: payload.status ?? existing.status,
    updatedAt: nowIso(),
  }
  devices[index] = updated
  saveTerminalDevices(devices)
  appendAuditLog('terminal_device.update', 'TerminalDevice', terminalDeviceId, null, {
    status: payload.status,
    label: payload.label,
    simulation: true,
  })

  return { terminalDevice: { ...updated, pendingInvitationCount: getTerminalDevicesWithCounts().find((device) => device.id === updated.id)?.pendingInvitationCount ?? updated.pendingInvitationCount } }
}

function revokeTerminalDevice(terminalDeviceId: string): { terminalDevice: ApiTerminalDevice } {
  return updateTerminalDevice(terminalDeviceId, { status: 'revoked' })
}

function regenerateTerminalToken(terminalDeviceId: string): RegenerateTerminalDeviceTokenResponse {
  const devices = getTerminalDevices()
  const device = devices.find((candidate) => candidate.id === terminalDeviceId)
  if (!device) throw new Error('Terminal introuvable dans la démo.')
  assertCanAdministerTerminalInDemo(device.building)

  const token = `${terminalDeviceId}-token-${crypto.randomUUID()}`
  terminalTokenSeeds[terminalDeviceId] = token
  const response = updateTerminalDevice(terminalDeviceId, { status: device.status === 'revoked' ? 'active' : device.status })
  appendAuditLog('terminal_device.token_regenerate', 'TerminalDevice', terminalDeviceId, null, {
    code: device.code,
    simulation: true,
  })

  return {
    terminalDevice: response.terminalDevice,
    terminalAccessToken: token,
    terminalLaunchLink: createTerminalLink(token),
  }
}

function getTerminalSession(terminalToken: string): TerminalSessionResponse {
  const terminalDevice = findTerminalByToken(terminalToken)
  const devices = getTerminalDevices()
  saveTerminalDevices(devices.map((device) => device.id === terminalDevice.id ? { ...device, lastSeenAt: nowIso() } : device))

  const invitations = getInvitations().filter((invitation) =>
    invitation.deliveryMode === 'onsite_terminal'
    && invitation.terminalDevice?.id === terminalDevice.id
    && ['sent', 'opened', 'in_progress', 'draft'].includes(invitation.status)
    && new Date(invitation.expiresAt).getTime() > Date.now(),
  )

  return {
    terminalDevice: { ...terminalDevice, lastSeenAt: nowIso(), pendingInvitationCount: invitations.length },
    invitations,
  }
}

function openTerminalInvitation(invitationId: string, payload: { terminalToken?: string }): OpenTerminalInvitationResponse {
  const terminalDevice = findTerminalByToken(payload.terminalToken ?? '')
  const invitations = getInvitations()
  const invitation = invitations.find((candidate) => candidate.id === invitationId)

  if (!invitation) throw new Error('Invitation terminal introuvable.')
  if (invitation.deliveryMode !== 'onsite_terminal') throw new Error('Cette invitation n’est pas destinée à un terminal.')
  if (invitation.terminalDevice?.id !== terminalDevice.id) throw new Error('Invitation affectée à un autre terminal.')
  if (invitation.building.id !== terminalDevice.building.id) throw new Error('Terminal hors bâtiment.')
  if (invitation.status === 'submitted' || invitation.responseStatus === 'locked') throw new Error('Invitation déjà soumise.')
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) throw new Error('Invitation expirée.')

  const questionnaire = getQuestionnaires().find((candidate) => candidate.versionId === invitation.questionnaireVersionId)
  if (!questionnaire) throw new Error('Questionnaire terminal introuvable.')

  const accessToken = `demo-terminal-${invitation.publicCode.toLowerCase()}-${crypto.randomUUID()}`
  const sessions = getRespondentSessions()
  sessions[accessToken] = createRespondentSession(accessToken, questionnaire, invitation.building, invitation.publicCode, 'draft', {
    ...invitation,
    status: 'opened',
    openedAt: invitation.openedAt ?? nowIso(),
  })
  saveRespondentSessions(sessions)

  invitation.status = 'opened'
  invitation.openedAt = invitation.openedAt ?? nowIso()
  invitation.responseStatus = 'draft'
  saveInvitations(invitations)

  appendAuditLog('terminal.invitation.open', 'Invitation', invitation.id, invitation.publicCode, {
    terminalDeviceId: terminalDevice.id,
    buildingId: terminalDevice.building.id,
    simulation: true,
  })

  return {
    invitation,
    accessToken,
    respondentAccessLink: `${createRespondentLink(accessToken)}?terminalToken=${encodeURIComponent(payload.terminalToken ?? '')}`,
  }
}

function findTerminalByToken(terminalToken: string): ApiTerminalDevice {
  const seededTerminalId = Object.entries(terminalTokenSeeds).find(([, token]) => token === terminalToken)?.[0]
  const terminalId = seededTerminalId ?? (terminalToken.endsWith('-token') ? terminalToken.slice(0, -'-token'.length) : null)
  const terminalDevice = terminalId ? getTerminalDevices().find((device) => device.id === terminalId) : null
  if (!terminalDevice || terminalDevice.status !== 'active') {
    throw new Error('Terminal de démonstration invalide ou désactivé.')
  }

  return terminalDevice
}

function assertTerminalTokenIfNeeded(session: RespondentSessionResponse, terminalToken?: string): void {
  if (session.invitation.deliveryMode !== 'onsite_terminal') return

  const terminalDevice = findTerminalByToken(terminalToken ?? '')
  if (session.invitation.terminalDevice?.id !== terminalDevice.id) {
    throw new Error('Cette session répondant doit rester sur le terminal hospitalier affecté.')
  }
}

function getRespondentSession(token: string, terminalToken?: string): RespondentSessionResponse {
  const sessions = getRespondentSessions()
  const session = sessions[token]

  if (!session) {
    throw new Error('Lien répondant invalide ou expiré dans la démo.')
  }

  assertTerminalTokenIfNeeded(session, terminalToken)

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

  assertTerminalTokenIfNeeded(session, payload.terminalToken)

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

function submitRespondentSession(payload: { token?: string; terminalToken?: string }): SubmitResponse {
  const token = payload.token ?? ''
  const sessions = getRespondentSessions()
  const session = sessions[token]

  if (!session) {
    throw new Error('Session répondant introuvable dans la démo.')
  }

  assertTerminalTokenIfNeeded(session, payload.terminalToken)

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
  return [createItqQuestionnaire(), createLec5Questionnaire(), createChpmQuestionnaire(), createPilotQuestionnaire()]
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


function createLec5Questionnaire(): ApiQuestionnaire {
  const questionnaire: ApiQuestionnaire = {
    id: 'demo-questionnaire-lec5-ppp',
    code: 'LEC5-PPP',
    title: 'Inventaire des événements de vie — LEC-5',
    description: 'PPP+ · Prévalence du Psychotrauma en Psychiatrie. Version papier de démonstration de l’inventaire LEC-5, intégré au parcours ITQ.',
    defaultLanguage: 'fr',
    versionId: LEC5_VERSION_ID,
    version: '1.0-papier-demo',
    versionLabel: '1.0-papier-demo',
    language: 'fr',
    finality: 'Repérer les situations difficiles ou stressantes vécues, observées, apprises ou rencontrées dans le cadre professionnel. Seed de démonstration, sans interprétation clinique automatisée.',
    status: 'published',
    isPublished: true,
    openFrom: addDaysIso(-7),
    openUntil: addDaysIso(180),
    groupCount: 0,
    questionCount: 0,
    groups: [
      {
        id: 'demo-group-lec5-intro',
        title: 'Présentation papier PPP+ / LEC-5',
        description: 'Questionnaire ITQ — version papier · Prévalence du Psychotrauma en Psychiatrie · CH de Montfavet Cloitre et al. ©2018 · traduction FR validée Peraud et al. 2022 · mise en page inspirée du Cn2r.',
        displayOrder: 1,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          question('demo-q-lec5-intro', 'LEC5-INTRO', 1, 'VOS EXPÉRIENCES — situations vécues (inventaire LEC-5)', 'information', {
            helperText: 'Voici une liste de situations difficiles ou stressantes qu’une personne peut avoir à traverser. Pour chaque situation, cochez la ou les case(s) correspondante(s). Encerclez celle qui fut la plus difficile pour vous, en considérant l’ensemble de votre vie, de l’enfance à l’âge adulte.',
          }),
        ],
      },
      {
        id: 'demo-group-lec5-events',
        title: 'Situations vécues',
        description: 'Pour chaque situation, cochez une ou plusieurs modalités : ce m’est arrivé, j’en ai été témoin, je l’ai appris, dans le cadre du travail, ne s’applique pas, ou je ne suis pas sûr.',
        displayOrder: 2,
        questionsPerPage: 3,
        randomize: false,
        questions: lec5Events.map((event, index) => question(`demo-q-${event.code.toLowerCase()}`, event.code, index + 1, event.label, 'multiple_choice', {
          helperText: 'Cochez la ou les case(s) correspondante(s). Plusieurs réponses sont possibles.',
          options: lec5ExposureOptions,
        })),
      },
      {
        id: 'demo-group-lec5-worst',
        title: 'Événement le plus difficile',
        description: 'Indiquez la situation qui fut la plus difficile pour vous sur l’ensemble de votre vie, puis précisez “Autre” si nécessaire.',
        displayOrder: 3,
        questionsPerPage: 1,
        randomize: false,
        questions: [
          question('demo-q-lec5-worst', 'LEC5-WORST', 1, 'Quelle situation fut la plus difficile pour vous ?', 'single_choice', {
            helperText: 'Correspond à la consigne papier “Encerclez celle qui fut la plus difficile pour vous”.',
            options: [
              ...lec5Events.map((event) => [event.code, event.label] as [string, string]),
              ['LEC5-E18', '18. Autre expérience précisée ci-dessous'],
            ],
          }),
          question('demo-q-lec5-other', 'LEC5-OTHER', 2, '18. Autre (précisez)', 'free_text_short', {
            helperText: 'Champ libre facultatif. Évitez les noms, dates exactes, lieux précis ou tout détail directement identifiant.',
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
  const terminal = terminalDeviceSeeds[0]
  if (!mtl || !terminal) return []

  const submitted: ApiInvitation[] = Array.from({ length: 6 }, (_, index) => ({
    id: `demo-invitation-submitted-${index + 1}`,
    publicCode: index === 0 ? '8F4K-29QX' : `DEMO-${String(index + 1).padStart(4, '0')}`,
    status: 'submitted' as InvitationStatus,
    deliveryMode: index === 5 ? 'onsite_terminal' : 'email_simulation',
    assistanceMode: index === 5 ? 'technical_help' : 'none',
    maskedEmail: index === 5 ? null : `r***.${index + 1}@example.org`,
    questionnaireVersionId: CHPM_VERSION_ID,
    questionnaireTitle: 'Questionnaire CHPM',
    versionLabel: '1.4',
    building: mtl,
    terminalDevice: index === 5 ? terminal : null,
    terminalDispatchedAt: index === 5 ? addDaysIso(-7) : null,
    expiresAt: addDaysIso(30),
    sentAt: addDaysIso(-9),
    openedAt: addDaysIso(-8),
    startedAt: addDaysIso(-8),
    submittedAt: addDaysIso(-(6 - index)),
    responseStatus: 'locked' as SubmissionStatus,
  }))

  return [
    {
      id: 'demo-invitation-terminal-mtl-open',
      publicCode: 'TERM-0001',
      status: 'sent',
      deliveryMode: 'onsite_terminal',
      assistanceMode: 'none',
      maskedEmail: null,
      questionnaireVersionId: ITQ_VERSION_ID,
      questionnaireTitle: 'International Trauma Questionnaire (ITQ)',
      versionLabel: '1.0-cn2r',
      building: mtl,
      terminalDevice: terminal,
      terminalDispatchedAt: nowIso(),
      expiresAt: addDaysIso(1),
      sentAt: nowIso(),
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      responseStatus: null,
    },
    {
      id: 'demo-invitation-itq-open',
      publicCode: 'ITQ-0001',
      status: 'sent',
      deliveryMode: 'email_simulation',
      assistanceMode: 'none',
      maskedEmail: 'i***@example.org',
      questionnaireVersionId: ITQ_VERSION_ID,
      questionnaireTitle: 'International Trauma Questionnaire (ITQ)',
      versionLabel: '1.0-cn2r',
      building: mtl,
      terminalDevice: null,
      terminalDispatchedAt: null,
      expiresAt: addDaysIso(30),
      sentAt: nowIso(),
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      responseStatus: null,
    },
    {
      id: 'demo-invitation-lec5-open',
      publicCode: 'LEC5-0001',
      status: 'sent',
      deliveryMode: 'email_simulation',
      assistanceMode: 'none',
      maskedEmail: 'l***@example.org',
      questionnaireVersionId: LEC5_VERSION_ID,
      questionnaireTitle: 'Inventaire des événements de vie — LEC-5',
      versionLabel: '1.0-papier-demo',
      building: mtl,
      terminalDevice: null,
      terminalDispatchedAt: null,
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
      deliveryMode: 'email_simulation',
      assistanceMode: 'none',
      maskedEmail: 'p***@example.org',
      questionnaireVersionId: CHPM_VERSION_ID,
      questionnaireTitle: 'Questionnaire CHPM',
      versionLabel: '1.4',
      building: mtl,
      terminalDevice: null,
      terminalDispatchedAt: null,
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
      deliveryMode: 'email_simulation',
      assistanceMode: 'none',
      maskedEmail: 'e***@example.org',
      questionnaireVersionId: CHPM_VERSION_ID,
      questionnaireTitle: 'Questionnaire CHPM',
      versionLabel: '1.4',
      building: mtl,
      terminalDevice: null,
      terminalDispatchedAt: null,
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
  const lec5 = questionnaires.find((questionnaire) => questionnaire.versionId === LEC5_VERSION_ID)
  const building = buildingSeeds[0]

  if (!chpm || !itq || !lec5 || !building) {
    return {}
  }

  const expiredDraft = createRespondentSession('demo-expired-draft', chpm, building, 'EXP-0001', 'draft')
  expiredDraft.invitation.expiresAt = addDaysIso(-3)
  expiredDraft.invitation.status = 'in_progress'
  expiredDraft.responseSession.startedAt = addDaysIso(-34)

  return {
    [CHPM_TOKEN]: createRespondentSession(CHPM_TOKEN, chpm, building, 'PEND-0001', 'draft'),
    [ITQ_TOKEN]: createRespondentSession(ITQ_TOKEN, itq, building, 'ITQ-0001', 'draft'),
    [LEC5_TOKEN]: createRespondentSession(LEC5_TOKEN, lec5, building, 'LEC5-0001', 'draft'),
    'demo-expired-draft': expiredDraft,
  }
}

function createRespondentSession(
  _token: string,
  questionnaire: ApiQuestionnaire,
  building: ApiBuilding,
  publicCode: string,
  status: SubmissionStatus,
  invitationOverride?: Partial<ApiInvitation>,
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
      status: invitationOverride?.status ?? (status === 'locked' ? 'submitted' : 'sent'),
      expiresAt: invitationOverride?.expiresAt ?? addDaysIso(30),
      building,
      deliveryMode: invitationOverride?.deliveryMode ?? 'email_simulation',
      assistanceMode: invitationOverride?.assistanceMode ?? 'none',
      terminalDevice: invitationOverride?.terminalDevice ?? null,
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
    createAuditLogRecord('judicial.request.received', 'JudicialAccessRequest', 'demo-jar-001', '8F4K-29QX', { workflow: 'double_validation', simulation: true }, addDaysIso(-1), 'demo-user-tech'),
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
  const actorSeed = actorUserId ? getDemoUsers().find((candidate) => (candidate.id ?? `demo-user-${candidate.role}`) === actorUserId) ?? null : null

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
    deliveryModes: [
      {
        mode: 'email_simulation',
        label: 'Email simulé',
        invited: 6,
        opened: 6,
        started: 6,
        submitted: 5,
        openingRate: 86,
        startRate: 86,
        submissionRate: 83,
      },
      {
        mode: 'onsite_terminal',
        label: 'Terminal hospitalier',
        invited: 2,
        opened: 1,
        started: 1,
        submitted: 1,
        openingRate: 50,
        startRate: 50,
        submissionRate: 50,
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
    request.secureDocumentId = `demo-secure-doc-${request.id}`
    request.exportExpiresAt = addMinutesIso(15)
    request.exportSizeBytes = 256
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
      secureDocument: {
        id: request.secureDocumentId ?? `demo-secure-doc-${request.id}`,
        documentType: 'judicial_identity_export',
        storageRef: `secure-document:judicial_identity_export:${request.id}`,
        algorithm: 'aes-256-gcm',
        keyRef: 'demo:SECURE_DOCUMENT_KEY_B64',
        fingerprint: request.exportFingerprint ?? 'demo-fingerprint',
        sizeBytes: request.exportSizeBytes ?? 256,
        expiresAt: request.exportExpiresAt ?? addMinutesIso(15),
        status: 'available',
        warning: 'Export fictif conservé dans le coffre documentaire ; aucun ciphertext n’est renvoyé.',
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

function createTerminalLink(token: string): string {
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`

  if (import.meta.env.VITE_ROUTER_MODE === 'hash') {
    return `${window.location.origin}${normalizedBasePath}#/terminal/${encodeURIComponent(token)}`
  }

  return `${window.location.origin}${normalizedBasePath}terminal/${encodeURIComponent(token)}`
}

function maskEmail(email?: string): string {
  const [localPart = '', domain = 'domaine.org'] = (email ?? 'x@domaine.org').split('@')
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

function addMinutesIso(minutes: number): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}
