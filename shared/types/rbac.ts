export const userRoles = ['admin', 'moderator', 'respondent'] as const

export type UserRole = (typeof userRoles)[number]

export type Permission =
  | 'questionnaire:configure'
  | 'questionnaire:preview'
  | 'invitation:create'
  | 'invitation:readScoped'
  | 'response:answerOwn'
  | 'statistics:read'
  | 'architecture:read'

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
    label: 'Administrateur',
    shortLabel: 'Admin',
    description: 'Configure les questionnaires, consulte les statistiques et supervise les droits.',
    permissions: [
      'questionnaire:configure',
      'questionnaire:preview',
      'invitation:create',
      'invitation:readScoped',
      'statistics:read',
      'architecture:read',
    ],
  },
  moderator: {
    role: 'moderator',
    label: 'Modérateur',
    shortLabel: 'Modérateur',
    description: 'Invite les répondants de son périmètre et suit les liens sans voir les réponses nominatives.',
    permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped'],
  },
  respondent: {
    role: 'respondent',
    label: 'Répondant',
    shortLabel: 'Répondant',
    description: 'Accède au questionnaire par code unique et répond uniquement à ses propres pages.',
    permissions: ['response:answerOwn'],
  },
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

export function hasRoleAccess(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(role)
}
