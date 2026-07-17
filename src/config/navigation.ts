import { t } from '@/i18n'
import type { UserRole } from '@shared/types/rbac'
import { hasRoleAccess } from '@shared/types/rbac'

export interface NavigationItem {
  label: string
  to: string
  roles: UserRole[]
  description: string
}

interface NavigationDefinition {
  labelKey: string
  to: string
  roles: UserRole[]
  descriptionKey: string
}

const navigationDefinitions: NavigationDefinition[] = [
  {
    labelKey: 'nav.home',
    to: '/',
    roles: [
      'admin',
      'moderator',
      'site_manager',
      'questionnaire_admin',
      'analyst',
      'technical_admin',
      'judicial_officer',
    ],
    descriptionKey: 'nav.home.description',
  },
  {
    labelKey: 'nav.projectAdministration',
    to: '/administration-projet',
    roles: ['admin'],
    descriptionKey: 'nav.projectAdministration.description',
  },
  {
    labelKey: 'nav.admin',
    to: '/admin',
    roles: ['admin', 'questionnaire_admin'],
    descriptionKey: 'nav.admin.description',
  },
  {
    labelKey: 'nav.moderation',
    to: '/moderation',
    roles: ['moderator', 'site_manager'],
    descriptionKey: 'nav.moderation.description',
  },
  {
    labelKey: 'nav.stats',
    to: '/stats',
    roles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst'],
    descriptionKey: 'nav.stats.description',
  },
  {
    labelKey: 'nav.terminals',
    to: '/terminaux',
    roles: ['admin', 'site_manager', 'moderator', 'technical_admin'],
    descriptionKey: 'nav.terminals.description',
  },
  {
    labelKey: 'nav.rgpd',
    to: '/rgpd',
    roles: ['admin', 'analyst', 'technical_admin', 'judicial_officer'],
    descriptionKey: 'nav.rgpd.description',
  },
]

export const navigationItems: NavigationItem[] = navigationDefinitions.map(resolveNavigationItem)

export const defaultPathByRole: Record<UserRole, string> = {
  admin: '/administration-projet',
  moderator: '/moderation',
  site_manager: '/moderation',
  questionnaire_admin: '/admin',
  analyst: '/stats',
  dpo: '/',
  judicial_officer: '/rgpd',
  technical_admin: '/terminaux',
  service_account: '/',
  respondent: '/',
}

export function getVisibleNavigation(role: UserRole): NavigationItem[] {
  return navigationDefinitions
    .filter((item) => hasRoleAccess(role, item.roles))
    .map(resolveNavigationItem)
}

function resolveNavigationItem(item: NavigationDefinition): NavigationItem {
  return {
    label: t(item.labelKey),
    to: item.to,
    roles: item.roles,
    description: t(item.descriptionKey),
  }
}
