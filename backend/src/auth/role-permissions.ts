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
  | 'audit:read'
  | 'architecture:read'
  | 'judicial:createRequest'
  | 'judicial:validateRequest'
  | 'judicial:executeAccess'
  | 'user:administer'
  | 'user:manageScoped'
  | 'notification:configure'
  | 'compliance:read'
  | 'compliance:maintain'
  | 'terminal:administer'

export type RoleFamily = 'operational' | 'specialized' | 'system'
export type RoleScope = 'global' | 'site' | 'building' | 'questionnaire' | 'analytics' | 'legal' | 'technical' | 'none'

export type RoleProfile = {
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

export const activeOperationalRoles = ['admin', 'site_manager', 'moderator'] as const satisfies readonly UserRole[]
export type ActiveOperationalRole = (typeof activeOperationalRoles)[number]

export const specializedStaffRoles = [
  'questionnaire_admin',
  'analyst',
  'dpo',
  'judicial_officer',
  'technical_admin',
] as const satisfies readonly UserRole[]

export const roleProfiles: Record<UserRole, RoleProfile> = {
  admin: {
    label: 'Administrateur global',
    shortLabel: 'Admin global',
    description: 'Niveau 1 : pilote toute la plateforme, les sites, les utilisateurs, les questionnaires et les indicateurs.',
    family: 'operational',
    rank: 300,
    scope: 'global',
    scopeLabel: 'Tous les sites et tous les bâtiments',
    activeRole: true,
    canDelegateTo: ['site_manager', 'moderator', 'questionnaire_admin', 'analyst', 'dpo', 'judicial_officer', 'technical_admin'],
    permissions: [
      'questionnaire:configure',
      'questionnaire:publish',
      'questionnaire:preview',
      'invitation:create',
      'invitation:readScoped',
      'invitation:resend',
      'statistics:read',
      'statistics:readSubmission',
      'statistics:exportPseudonymized',
      'audit:read',
      'architecture:read',
      'notification:configure',
      'compliance:read',
      'compliance:maintain',
      'user:administer',
      'user:manageScoped',
      'terminal:administer',
    ],
  },
  site_manager: {
    label: 'Gestionnaire de site',
    shortLabel: 'Gestion site',
    description: 'Niveau 2 : gère les invitations, les terminaux, les modérateurs et les indicateurs agrégés uniquement sur son site.',
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
      'statistics:read',
      'notification:configure',
      'user:manageScoped',
      'terminal:administer',
    ],
  },
  moderator: {
    label: 'Modérateur bâtiment',
    shortLabel: 'Modérateur',
    description: 'Niveau 3 : invite les répondants de son bâtiment et suit les statuts sans accéder aux réponses.',
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
    label: 'Administrateur questionnaire',
    shortLabel: 'Admin quest.',
    description: 'Rôle spécialisé : crée, versionne et publie les questionnaires sans accès direct aux emails.',
    family: 'specialized',
    rank: 240,
    scope: 'questionnaire',
    scopeLabel: 'Questionnaires et versions',
    activeRole: false,
    parentRole: 'admin',
    canDelegateTo: [],
    permissions: [
      'questionnaire:configure',
      'questionnaire:publish',
      'questionnaire:preview',
      'statistics:read',
      'architecture:read',
      'notification:configure',
    ],
  },
  analyst: {
    label: 'Analyste données',
    shortLabel: 'Analyste',
    description: 'Rôle spécialisé : consulte les statistiques et soumissions pseudonymisées selon seuils.',
    family: 'specialized',
    rank: 160,
    scope: 'analytics',
    scopeLabel: 'Statistiques pseudonymisées',
    activeRole: false,
    parentRole: 'admin',
    canDelegateTo: [],
    permissions: ['statistics:read', 'statistics:readSubmission', 'statistics:exportPseudonymized', 'compliance:read'],
  },
  dpo: {
    label: 'DPO / référent RGPD',
    shortLabel: 'DPO',
    description: 'Rôle spécialisé : audite la conformité, les demandes de droits et les accès exceptionnels.',
    family: 'specialized',
    rank: 260,
    scope: 'legal',
    scopeLabel: 'Conformité, audit et validation DPO',
    activeRole: false,
    parentRole: 'admin',
    canDelegateTo: [],
    permissions: [
      'statistics:read',
      'statistics:readSubmission',
      'audit:read',
      'architecture:read',
      'judicial:createRequest',
      'judicial:validateRequest',
      'compliance:read',
      'compliance:maintain',
    ],
  },
  judicial_officer: {
    label: 'Responsable accès judiciaire',
    shortLabel: 'Judiciaire',
    description: 'Rôle spécialisé : gère le workflow exceptionnel d’accès email-code sous double contrôle.',
    family: 'specialized',
    rank: 250,
    scope: 'legal',
    scopeLabel: 'Workflow judiciaire du coffre email',
    activeRole: false,
    parentRole: 'admin',
    canDelegateTo: [],
    permissions: ['judicial:createRequest', 'judicial:validateRequest', 'judicial:executeAccess', 'audit:read', 'compliance:read'],
  },
  technical_admin: {
    label: 'Administrateur technique',
    shortLabel: 'Tech',
    description: 'Rôle spécialisé : exploite l’infrastructure avec accès applicatif limité et tracé.',
    family: 'specialized',
    rank: 220,
    scope: 'technical',
    scopeLabel: 'Infrastructure, terminaux et registre technique',
    activeRole: false,
    parentRole: 'admin',
    canDelegateTo: [],
    permissions: ['audit:read', 'architecture:read', 'compliance:read', 'compliance:maintain', 'terminal:administer'],
  },
  service_account: {
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

export function isActiveOperationalRole(role: UserRole): role is ActiveOperationalRole {
  return activeOperationalRoles.includes(role as ActiveOperationalRole)
}

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
export const statisticsRoles: UserRole[] = ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo']
export const auditRoles: UserRole[] = ['admin', 'dpo', 'judicial_officer', 'technical_admin']
