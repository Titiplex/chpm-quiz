import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { t } from '@/i18n'
import { allRoles, type UserRole } from '@shared/types/rbac'

declare module 'vue-router' {
  interface RouteMeta {
    label: string
    allowedRoles: UserRole[]
    requiresAuthenticatedUser: boolean
  }
}

const isStaticPagesDemo = import.meta.env.VITE_STATIC_PAGES_DEMO === 'true'

function createStaticPagesRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/',
      redirect: '/moderation',
    },
    {
      path: '/moderation',
      name: 'static-moderation',
      component: () => import('@/views/StaticModeratorView.vue'),
      meta: {
        label: t('nav.static.moderator'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/questionnaire',
      name: 'static-patient-questionnaire',
      component: () => import('@/views/StaticPatientQuestionnaireView.vue'),
      meta: {
        label: t('nav.static.questionnaire'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/r/:token',
      redirect: '/questionnaire',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/moderation',
    },
  ]
}

function createConnectedRoutes(): RouteRecordRaw[] {
  return [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        label: t('nav.login'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        label: t('nav.home'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminBuilderView.vue'),
      meta: {
        label: t('nav.admin'),
        allowedRoles: ['admin', 'questionnaire_admin'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('@/views/ModeratorView.vue'),
      meta: {
        label: t('nav.moderation'),
        allowedRoles: ['admin', 'moderator', 'site_manager'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/questionnaire',
      name: 'questionnaire',
      component: () => import('@/views/RespondentView.vue'),
      meta: {
        label: t('nav.respondentPreview'),
        allowedRoles: ['admin', 'moderator', 'questionnaire_admin'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/r/:token',
      name: 'respondent-token',
      component: () => import('@/views/RespondentView.vue'),
      meta: {
        label: t('nav.static.questionnaire'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: {
        label: t('nav.stats'),
        allowedRoles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/terminaux',
      name: 'terminals-admin',
      component: () => import('@/views/TerminalAdminView.vue'),
      meta: {
        label: t('nav.terminals'),
        allowedRoles: ['admin', 'site_manager', 'moderator', 'technical_admin'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/terminal/:terminalToken?',
      name: 'terminal',
      component: () => import('@/views/TerminalView.vue'),
      meta: {
        label: t('nav.terminals'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/rgpd',
      name: 'compliance',
      component: () => import('@/views/ComplianceView.vue'),
      meta: {
        label: t('nav.rgpd'),
        allowedRoles: ['admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/coffre-email',
      name: 'identity-vault',
      component: () => import('@/views/IdentityVaultView.vue'),
      meta: {
        label: t('nav.identityVault'),
        allowedRoles: ['dpo', 'judicial_officer'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/architecture',
      name: 'architecture',
      component: () => import('@/views/ArchitectureView.vue'),
      meta: {
        label: t('nav.architecture'),
        allowedRoles: [
          'admin',
          'questionnaire_admin',
          'dpo',
          'technical_admin',
          'judicial_officer',
        ],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/AccessDeniedView.vue'),
      meta: {
        label: t('nav.forbidden'),
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ]
}

const routes = isStaticPagesDemo ? createStaticPagesRoutes() : createConnectedRoutes()

const router = createRouter({
  history:
    import.meta.env.VITE_ROUTER_MODE === 'hash'
      ? createWebHashHistory(import.meta.env.BASE_URL)
      : createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (isStaticPagesDemo) {
    return true
  }

  const [{ defaultPathByRole }, { useSessionStore }, { hasRoleAccess }] = await Promise.all([
    import('@/config/navigation'),
    import('@/stores/session'),
    import('@shared/types/rbac'),
  ])
  const session = useSessionStore()

  if (!session.isBootstrapped) {
    await session.restore()
  }

  if (to.name === 'login') {
    if (session.isAuthenticated) {
      return defaultPathByRole[session.currentRole]
    }

    return true
  }

  if (to.meta.requiresAuthenticatedUser && !session.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.name === 'forbidden') {
    return true
  }

  if (!hasRoleAccess(session.currentRole, to.meta.allowedRoles)) {
    return {
      path: '/403',
      query: {
        from: to.fullPath,
        role: session.currentRole,
        fallback: defaultPathByRole[session.currentRole],
      },
    }
  }

  return true
})

export default router
