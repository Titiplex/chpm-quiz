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

export type RoleProfile = {
  label: string
  shortLabel: string
  description: string
  permissions: Permission[]
}

export const roleProfiles: Record<UserRole, RoleProfile> = {
  admin: {
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
    label: 'Modérateur',
    shortLabel: 'Modérateur',
    description: 'Invite les répondants de son périmètre et suit les statuts sans accéder aux réponses.',
    permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped', 'invitation:resend'],
  },
  site_manager: {
    label: 'Responsable site',
    shortLabel: 'Resp. site',
    description: 'Suit les indicateurs agrégés sur son périmètre site ou bâtiment.',
    permissions: ['invitation:readScoped', 'statistics:read'],
  },
  questionnaire_admin: {
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
    label: 'Analyste données',
    shortLabel: 'Analyste',
    description: 'Consulte les statistiques et soumissions pseudonymisées selon seuils.',
    permissions: ['statistics:read', 'statistics:readSubmission', 'statistics:exportPseudonymized'],
  },
  dpo: {
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
    label: 'Responsable accès judiciaire',
    shortLabel: 'Judiciaire',
    description: 'Gère le workflow exceptionnel d’accès email-code sous double contrôle.',
    permissions: ['judicial:createRequest', 'judicial:validateRequest', 'judicial:executeAccess', 'audit:read'],
  },
  technical_admin: {
    label: 'Administrateur technique',
    shortLabel: 'Tech',
    description: 'Exploite l’infrastructure avec accès applicatif limité et tracé.',
    permissions: ['audit:read', 'architecture:read'],
  },
  service_account: {
    label: 'Service account',
    shortLabel: 'Service',
    description: 'Compte technique à privilèges minimaux pour traitements asynchrones.',
    permissions: [],
  },
  respondent: {
    label: 'Répondant',
    shortLabel: 'Répondant',
    description: 'Rôle logique : accès par jeton signé, sans compte interne.',
    permissions: ['response:answerOwn'],
  },
}

export const adminLikeRoles: UserRole[] = ['admin', 'questionnaire_admin']
export const statisticsRoles: UserRole[] = ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo']
export const auditRoles: UserRole[] = ['admin', 'dpo', 'judicial_officer', 'technical_admin']
