import type { UserRole } from '@shared/types/rbac'
import { allRoles, hasRoleAccess } from '@shared/types/rbac'

export interface NavigationItem {
  label: string
  to: string
  roles: UserRole[]
  description: string
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Accueil',
    to: '/',
    roles: [...allRoles],
    description: 'Vue produit et parcours de démonstration.',
  },
  {
    label: 'Admin',
    to: '/admin',
    roles: ['admin'],
    description: 'Construction du questionnaire, groupes, questions, popups et règles adaptatives.',
  },
  {
    label: 'Modération',
    to: '/moderation',
    roles: ['admin', 'moderator'],
    description: 'Invitations et suivi par bâtiment sans consultation nominative des réponses.',
  },
  {
    label: 'Questionnaire',
    to: '/questionnaire',
    roles: [...allRoles],
    description: 'Expérience répondant et aperçu de passation.',
  },
  {
    label: 'Statistiques',
    to: '/stats',
    roles: ['admin'],
    description: 'Analyse anonyme, temps de réponse, popups et soumissions.',
  },
  {
    label: 'Architecture / sécurité',
    to: '/architecture',
    roles: ['admin'],
    description: 'Séparation des données, flux et contrôle des accès.',
  },
]

export const defaultPathByRole: Record<UserRole, string> = {
  admin: '/admin',
  moderator: '/moderation',
  respondent: '/questionnaire',
}

export function getVisibleNavigation(role: UserRole): NavigationItem[] {
  return navigationItems.filter((item) => hasRoleAccess(role, item.roles))
}
