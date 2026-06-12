import type { UserRole } from '@prisma/client'

export type Permission =
  | 'questionnaire:configure'
  | 'questionnaire:preview'
  | 'invitation:create'
  | 'invitation:readScoped'
  | 'response:answerOwn'
  | 'statistics:read'
  | 'architecture:read'

type RoleProfile = {
  label: string
  shortLabel: string
  description: string
  permissions: Permission[]
}

export const roleProfiles: Record<UserRole, RoleProfile> = {
  admin: {
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
    label: 'Modérateur',
    shortLabel: 'Modérateur',
    description:
      'Invite les répondants de son périmètre et suit les liens sans voir les réponses nominatives.',
    permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped'],
  },
  respondent: {
    label: 'Répondant',
    shortLabel: 'Répondant',
    description:
      'Accède au questionnaire par code unique et répond uniquement à ses propres pages.',
    permissions: ['response:answerOwn'],
  },
}
