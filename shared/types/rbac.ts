export const userRoles = [
  'admin',
  'moderator',
  'site_manager',
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

export interface RoleProfile {
  role: UserRole
  label: string
  shortLabel: string
  description: string
  permissions: Permission[]
}

export interface SecuredRouteMeta {
  label: string
  allowedRoles: UserRole[]
  requiresAuthenticatedUser: boolean
}

export const allRoles = [...userRoles]

export const roleProfiles: Record<UserRole, RoleProfile> = {
  admin: {
    role: 'admin',
    label: 'Administrateur global',
    shortLabel: 'Admin global',
    description: 'Administre la plateforme, les utilisateurs, les questionnaires et les indicateurs.',
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
      'user:administer',
    ],
  },
  moderator: {
    role: 'moderator',
    label: 'Modérateur',
    shortLabel: 'Modérateur',
    description: 'Invite les répondants de son périmètre et suit les statuts sans accéder aux réponses.',
    permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped', 'invitation:resend'],
  },
  site_manager: {
    role: 'site_manager',
    label: 'Responsable site',
    shortLabel: 'Resp. site',
    description: 'Suit les indicateurs agrégés sur son périmètre site ou bâtiment.',
    permissions: ['invitation:readScoped', 'statistics:read'],
  },
  questionnaire_admin: {
    role: 'questionnaire_admin',
    label: 'Administrateur questionnaire',
    shortLabel: 'Admin quest.',
    description: 'Crée, versionne et publie les questionnaires sans accès direct aux emails.',
    permissions: [
      'questionnaire:configure',
      'questionnaire:publish',
      'questionnaire:preview',
      'statistics:read',
      'architecture:read',
    ],
  },
  analyst: {
    role: 'analyst',
    label: 'Analyste données',
    shortLabel: 'Analyste',
    description: 'Consulte les statistiques et soumissions pseudonymisées selon les seuils.',
    permissions: ['statistics:read', 'statistics:readSubmission', 'statistics:exportPseudonymized'],
  },
  dpo: {
    role: 'dpo',
    label: 'DPO / référent RGPD',
    shortLabel: 'DPO',
    description: 'Audite la conformité, les demandes de droits et les accès exceptionnels.',
    permissions: [
      'statistics:read',
      'statistics:readSubmission',
      'audit:read',
      'architecture:read',
      'judicial:createRequest',
      'judicial:validateRequest',
    ],
  },
  judicial_officer: {
    role: 'judicial_officer',
    label: 'Responsable accès judiciaire',
    shortLabel: 'Judiciaire',
    description: 'Gère le workflow exceptionnel d’accès email-code sous double contrôle.',
    permissions: ['judicial:createRequest', 'judicial:validateRequest', 'judicial:executeAccess', 'audit:read'],
  },
  technical_admin: {
    role: 'technical_admin',
    label: 'Administrateur technique',
    shortLabel: 'Tech',
    description: 'Exploite l’infrastructure avec accès applicatif limité et tracé.',
    permissions: ['audit:read', 'architecture:read'],
  },
  service_account: {
    role: 'service_account',
    label: 'Service account',
    shortLabel: 'Service',
    description: 'Compte technique à privilèges minimaux pour traitements asynchrones.',
    permissions: [],
  },
  respondent: {
    role: 'respondent',
    label: 'Répondant',
    shortLabel: 'Répondant',
    description: 'Rôle logique : accès par jeton signé, sans compte interne.',
    permissions: ['response:answerOwn'],
  },
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

export function hasRoleAccess(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(role)
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return roleProfiles[role]?.permissions.includes(permission) ?? false
}
