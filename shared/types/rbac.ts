/** Stable role identifiers persisted by the backend and exchanged through the API. */
export const userRoles = [
  'admin',
  'site_manager',
  'moderator',
  'questionnaire_admin',
  'analyst',
  'dpo',
  'judicial_officer',
  'technical_admin',
  'service_account',
  'respondent',
] as const

export type UserRole = (typeof userRoles)[number]

export const projectAdminRole = 'admin' as const
export type ProjectAdminRole = typeof projectAdminRole

/** Capability labels used for UI affordances and public staff profiles. */
export type Permission =
  | 'questionnaire:configure'
  | 'questionnaire:publish'
  | 'questionnaire:preview'
  | 'invitation:create'
  | 'invitation:readScoped'
  | 'invitation:resend'
  | 'response:answerOwn'
  | 'statistics:read'
  | 'statistics:readSubmission'
  | 'statistics:exportPseudonymized'
  | 'stats:readAggregatedScoped'
  | 'stats:readPseudonymized'
  | 'audit:read'
  | 'architecture:read'
  | 'judicial:createRequest'
  | 'judicial:validateRequest'
  | 'judicial:executeAccess'
  | 'user:createProjectAdmin'
  | 'user:manageSiteAdmins'
  | 'user:manageModeratorsScoped'
  | 'user:administer'
  | 'user:manageScoped'
  | 'identity:accessConfidential'
  | 'identity:exportCodeEmail'
  | 'notification:configure'
  | 'compliance:read'
  | 'compliance:maintain'
  | 'terminal:administer'

export type RoleFamily = 'operational' | 'specialized' | 'system'
export type RoleScope = 'global' | 'site' | 'building' | 'questionnaire' | 'analytics' | 'legal' | 'technical' | 'none'

/** Human-facing role metadata; it does not replace backend authorization checks. */
export interface RoleProfile {
  role: UserRole
  label: string
  shortLabel: string
  description: string
  family: RoleFamily
  rank: number
  scope: RoleScope
  scopeLabel: string
  activeRole: boolean
  parentRole?: UserRole
  canDelegateTo: UserRole[]
  permissions: Permission[]
}

export interface SecuredRouteMeta {
  label: string
  allowedRoles: UserRole[]
  requiresAuthenticatedUser: boolean
}

export const allRoles = [...userRoles]

export const activeOperationalRoles = ['admin', 'site_manager', 'moderator'] as const satisfies readonly UserRole[]
export type ActiveOperationalRole = (typeof activeOperationalRoles)[number]

export const specializedStaffRoles = [
  'questionnaire_admin',
  'analyst',
  'dpo',
  'judicial_officer',
  'technical_admin',
] as const satisfies readonly UserRole[]

/** Shared role catalog used by navigation and explanatory UI. */
export const roleProfiles: Record<UserRole, RoleProfile> = {
  admin: {
    role: 'admin',
    label: 'Administrateur projet / chercheur',
    shortLabel: 'Admin projet',
    description: 'Niveau 1 : responsable central du projet, nommé uniquement par console locale sécurisée. Gère les responsables de site sans accès au coffre identité ni aux emails répondants.',
    family: 'operational',
    rank: 300,
    scope: 'global',
    scopeLabel: 'Projet complet, hors données confidentielles DPO',
    activeRole: true,
    canDelegateTo: ['site_manager'],
    permissions: [
      'questionnaire:configure',
      'questionnaire:publish',
      'questionnaire:preview',
      'invitation:readScoped',
      'stats:readAggregatedScoped',
      'stats:readPseudonymized',
      'audit:read',
      'architecture:read',
      'notification:configure',
      'compliance:read',
      'user:manageSiteAdmins',
      'terminal:administer',
      'statistics:read',
      'statistics:exportPseudonymized',
    ],
  },
  site_manager: {
    role: 'site_manager',
    label: 'Responsable de site',
    shortLabel: 'Resp. site',
    description: 'Niveau 2 : administre son site, ses bâtiments et ses modérateurs. Ne peut pas créer de rôle supérieur ni accéder au coffre identité.',
    family: 'operational',
    rank: 200,
    scope: 'site',
    scopeLabel: 'Site affecté et bâtiments rattachés',
    activeRole: true,
    parentRole: 'admin',
    canDelegateTo: ['moderator'],
    permissions: [
      'invitation:create',
      'invitation:readScoped',
      'invitation:resend',
      'stats:readAggregatedScoped',
      'notification:configure',
      'user:manageModeratorsScoped',
      'terminal:administer',
      'statistics:read',
      'user:manageScoped',
    ],
  },
  moderator: {
    role: 'moderator',
    label: 'Modérateur terrain',
    shortLabel: 'Modérateur',
    description: 'Niveau 3 : invite les répondants et suit les statuts dans son périmètre, sans accès aux emails ni aux réponses confidentielles.',
    family: 'operational',
    rank: 100,
    scope: 'building',
    scopeLabel: 'Bâtiment affecté',
    activeRole: true,
    parentRole: 'site_manager',
    canDelegateTo: [],
    permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped', 'invitation:resend', 'notification:configure'],
  },
  questionnaire_admin: {
    role: 'questionnaire_admin',
    label: 'Administrateur questionnaire',
    shortLabel: 'Admin quest.',
    description: 'Rôle spécialisé : crée, versionne et publie les questionnaires sans accès direct aux emails.',
    family: 'specialized',
    rank: 240,
    scope: 'questionnaire',
    scopeLabel: 'Questionnaires et versions',
    activeRole: false,
    canDelegateTo: [],
    permissions: [
      'questionnaire:configure',
      'questionnaire:publish',
      'questionnaire:preview',
      'stats:readAggregatedScoped',
      'architecture:read',
      'notification:configure',
      'statistics:read',
    ],
  },
  analyst: {
    role: 'analyst',
    label: 'Analyste données',
    shortLabel: 'Analyste',
    description: 'Rôle spécialisé : consulte les statistiques agrégées et exports pseudonymisés sous seuils anti-réidentification, sans email.',
    family: 'specialized',
    rank: 160,
    scope: 'analytics',
    scopeLabel: 'Statistiques pseudonymisées',
    activeRole: false,
    canDelegateTo: [],
    permissions: ['stats:readAggregatedScoped', 'stats:readPseudonymized', 'statistics:read', 'statistics:readSubmission', 'statistics:exportPseudonymized', 'compliance:read'],
  },
  dpo: {
    role: 'dpo',
    label: 'DPO / référent RGPD',
    shortLabel: 'DPO',
    description: 'Rôle conformité séparé du frontend métier. Accède exceptionnellement aux données confidentielles par console dédiée, avec justification, périmètre explicite et audit.',
    family: 'specialized',
    rank: 260,
    scope: 'legal',
    scopeLabel: 'Console DPO dédiée, hors SPA métier',
    activeRole: false,
    canDelegateTo: [],
    permissions: ['identity:accessConfidential', 'identity:exportCodeEmail', 'audit:read', 'compliance:read', 'compliance:maintain'],
  },
  judicial_officer: {
    role: 'judicial_officer',
    label: 'Référent procédure légale',
    shortLabel: 'Procédure',
    description: 'Rôle spécialisé de suivi procédural sans accès direct libre au coffre identité.',
    family: 'specialized',
    rank: 250,
    scope: 'legal',
    scopeLabel: 'Procédures et audit légal',
    activeRole: false,
    canDelegateTo: [],
    permissions: ['judicial:createRequest', 'judicial:validateRequest', 'audit:read', 'compliance:read'],
  },
  technical_admin: {
    role: 'technical_admin',
    label: 'Administrateur technique',
    shortLabel: 'Tech',
    description: 'Rôle exploitation : maintenance, sécurité et observabilité sans accès applicatif aux données confidentielles.',
    family: 'specialized',
    rank: 220,
    scope: 'technical',
    scopeLabel: 'Infrastructure, terminaux et registre technique',
    activeRole: false,
    canDelegateTo: [],
    permissions: ['audit:read', 'architecture:read', 'compliance:read', 'compliance:maintain', 'terminal:administer'],
  },
  service_account: {
    role: 'service_account',
    label: 'Service account',
    shortLabel: 'Service',
    description: 'Compte technique à privilèges minimaux pour traitements asynchrones.',
    family: 'system',
    rank: 0,
    scope: 'none',
    scopeLabel: 'Aucun périmètre utilisateur',
    activeRole: false,
    canDelegateTo: [],
    permissions: [],
  },
  respondent: {
    role: 'respondent',
    label: 'Répondant',
    shortLabel: 'Répondant',
    description: 'Rôle logique : accès par jeton signé, sans compte interne.',
    family: 'system',
    rank: 0,
    scope: 'none',
    scopeLabel: 'Questionnaire lié au jeton',
    activeRole: false,
    canDelegateTo: [],
    permissions: ['response:answerOwn'],
  },
}

export const activeRoleHierarchy = activeOperationalRoles.map((role) => roleProfiles[role])

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

export function isActiveOperationalRole(role: UserRole): role is ActiveOperationalRole {
  return activeOperationalRoles.includes(role as ActiveOperationalRole)
}

/** Checks frontend route visibility only; server guards remain authoritative. */
export function hasRoleAccess(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(role)
}

/** Checks the shared capability catalog for UI behavior, not object-level scope. */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return roleProfiles[role]?.permissions.includes(permission) ?? false
}

/** Returns whether ordinary role delegation allows `managerRole` to create/manage `targetRole`. */
export function canDelegateRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return roleProfiles[managerRole]?.canDelegateTo.includes(targetRole) ?? false
}

export function roleInheritsFrom(role: UserRole, ancestorRole: UserRole): boolean {
  let current: UserRole | undefined = roleProfiles[role]?.parentRole

  while (current) {
    if (current === ancestorRole) {
      return true
    }

    current = roleProfiles[current]?.parentRole
  }

  return false
}

export const adminLikeRoles: UserRole[] = ['admin', 'questionnaire_admin']
export const statisticsRoles: UserRole[] = ['admin', 'site_manager', 'questionnaire_admin', 'analyst']
export const auditRoles: UserRole[] = ['admin', 'dpo', 'judicial_officer', 'technical_admin']
