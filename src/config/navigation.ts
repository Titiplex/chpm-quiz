import type { UserRole } from '@shared/types/rbac'
import { hasRoleAccess } from '@shared/types/rbac'

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
    roles: ['admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
    description: 'Vue produit et parcours de démonstration.',
  },
  {
    label: 'Admin',
    to: '/admin',
    roles: ['admin', 'questionnaire_admin'],
    description: 'Construction du questionnaire, versions, groupes, questions, popups et règles.',
  },
  {
    label: 'Modération',
    to: '/moderation',
    roles: ['admin', 'moderator', 'site_manager'],
    description: 'Invitations, jetons répondants et suivi par bâtiment.',
  },
  {
    label: 'Prévisualisation répondant',
    to: '/questionnaire',
    roles: ['admin', 'moderator', 'questionnaire_admin'],
    description: 'Rappel du parcours répondant par lien signé.',
  },
  {
    label: 'Statistiques',
    to: '/stats',
    roles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
    description: 'Analyse pseudonymisée, seuils anti-réidentification, temps et popups.',
  },



  {
    label: 'Terminaux',
    to: '/terminaux',
    roles: ['admin', 'site_manager', 'moderator', 'technical_admin'],
    description: 'Inventaire scoped des terminaux ; administration globale ou par site selon le rôle.'
  },


  {
    label: 'RGPD',
    to: '/rgpd',
    roles: ['admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
    description: 'Registre technique, conservation, export pseudonymisé, audit et maintenance.',
  },

  {
    label: 'Coffre email',
    to: '/coffre-email',
    roles: ['dpo', 'judicial_officer'],
    description: 'Workflow judiciaire, double validation et audit du coffre identité.',
  },
  {
    label: 'Architecture / sécurité',
    to: '/architecture',
    roles: ['admin', 'questionnaire_admin', 'dpo', 'technical_admin', 'judicial_officer'],
    description: 'Séparation des données, audit et procédure judiciaire.',
  },
]

export const defaultPathByRole: Record<UserRole, string> = {
  admin: '/admin',
  moderator: '/moderation',
  site_manager: '/moderation',
  questionnaire_admin: '/admin',
  analyst: '/stats',
  dpo: '/coffre-email',
  judicial_officer: '/coffre-email',
  technical_admin: '/terminaux',
  service_account: '/',
  respondent: '/questionnaire',
}

export function getVisibleNavigation(role: UserRole): NavigationItem[] {
  return navigationItems.filter((item) => hasRoleAccess(role, item.roles))
}
