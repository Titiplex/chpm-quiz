import { t } from '@/i18n'
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
    label: t('nav.home'),
    to: '/',
    roles: ['admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
    description: t('nav.home.description'),
  },
  {
    label: t('nav.admin'),
    to: '/admin',
    roles: ['admin', 'questionnaire_admin'],
    description: t('nav.admin.description'),
  },
  {
    label: t('nav.moderation'),
    to: '/moderation',
    roles: ['admin', 'moderator', 'site_manager'],
    description: t('nav.moderation.description'),
  },
  {
    label: t('nav.respondentPreview'),
    to: '/questionnaire',
    roles: ['admin', 'moderator', 'questionnaire_admin'],
    description: t('nav.respondentPreview.description'),
  },
  {
    label: t('nav.stats'),
    to: '/stats',
    roles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
    description: t('nav.stats.description'),
  },
  {
    label: t('nav.terminals'),
    to: '/terminaux',
    roles: ['admin', 'site_manager', 'moderator', 'technical_admin'],
    description: t('nav.terminals.description'),
  },
  {
    label: t('nav.rgpd'),
    to: '/rgpd',
    roles: ['admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
    description: t('nav.rgpd.description'),
  },
  {
    label: t('nav.identityVault'),
    to: '/coffre-email',
    roles: ['dpo', 'judicial_officer'],
    description: t('nav.identityVault.description'),
  },
  {
    label: t('nav.architecture'),
    to: '/architecture',
    roles: ['admin', 'questionnaire_admin', 'dpo', 'technical_admin', 'judicial_officer'],
    description: t('nav.architecture.description'),
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
