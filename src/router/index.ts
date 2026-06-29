import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { allRoles, type UserRole } from '@shared/types/rbac'

declare module 'vue-router' {
  interface RouteMeta {
    label: string
    allowedRoles: UserRole[]
    requiresAuthenticatedUser: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      label: 'Connexion',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: false,
    },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      label: 'Accueil',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminBuilderView.vue'),
    meta: {
      label: 'Administration',
      allowedRoles: ['admin', 'questionnaire_admin'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/moderation',
    name: 'moderation',
    component: () => import('@/views/ModeratorView.vue'),
    meta: {
      label: 'Modération',
      allowedRoles: ['admin', 'moderator', 'site_manager'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/questionnaire',
    name: 'questionnaire',
    component: () => import('@/views/RespondentView.vue'),
    meta: {
      label: 'Questionnaire',
      allowedRoles: ['admin', 'moderator', 'questionnaire_admin'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/terminal/:terminalToken?',
    name: 'terminal',
    component: () => import('@/views/TerminalView.vue'),
    meta: {
      label: 'Terminal hospitalier',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: false,
    },
  },
  {
    path: '/r/:token',
    name: 'respondent-token',
    component: () => import('@/views/RespondentView.vue'),
    meta: {
      label: 'Questionnaire répondant',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: false,
    },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: {
      label: 'Statistiques',
      allowedRoles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
      requiresAuthenticatedUser: true,
    },
  },



  {
    path: '/terminaux',
    name: 'terminal-admin',
    component: () => import('@/views/TerminalAdminView.vue'),
    meta: {
      label: 'Terminaux hospitaliers',
      allowedRoles: ['admin', 'site_manager', 'moderator', 'technical_admin'],
      requiresAuthenticatedUser: true,
    },
  },


  {
    path: '/rgpd',
    name: 'compliance',
    component: () => import('@/views/ComplianceView.vue'),
    meta: {
      label: 'RGPD / sécurité',
      allowedRoles: ['admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
      requiresAuthenticatedUser: true,
    },
  },

  {
    path: '/coffre-email',
    name: 'identity-vault',
    component: () => import('@/views/IdentityVaultView.vue'),
    meta: {
      label: 'Coffre email',
      allowedRoles: ['dpo', 'judicial_officer'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/architecture',
    name: 'architecture',
    component: () => import('@/views/ArchitectureView.vue'),
    meta: {
      label: 'Architecture / sécurité',
      allowedRoles: ['admin', 'questionnaire_admin', 'dpo', 'technical_admin', 'judicial_officer'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/AccessDeniedView.vue'),
    meta: {
      label: 'Accès refusé',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
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
        label: 'Vue modérateur',
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/questionnaire',
      name: 'static-patient-questionnaire',
      component: () => import('@/views/StaticPatientQuestionnaireView.vue'),
      meta: {
        label: 'Questionnaire patient',
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
        label: 'Connexion',
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        label: 'Accueil',
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminBuilderView.vue'),
      meta: {
        label: 'Administration',
        allowedRoles: ['admin', 'questionnaire_admin'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('@/views/ModeratorView.vue'),
      meta: {
        label: 'Modération',
        allowedRoles: ['admin', 'moderator', 'site_manager'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/questionnaire',
      name: 'questionnaire',
      component: () => import('@/views/RespondentView.vue'),
      meta: {
        label: 'Questionnaire',
        allowedRoles: ['admin', 'moderator', 'questionnaire_admin'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/r/:token',
      name: 'respondent-token',
      component: () => import('@/views/RespondentView.vue'),
      meta: {
        label: 'Questionnaire répondant',
        allowedRoles: [...allRoles],
        requiresAuthenticatedUser: false,
      },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: {
        label: 'Statistiques',
        allowedRoles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/rgpd',
      name: 'compliance',
      component: () => import('@/views/ComplianceView.vue'),
      meta: {
        label: 'RGPD / sécurité',
        allowedRoles: ['admin', 'analyst', 'dpo', 'technical_admin', 'judicial_officer'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/coffre-email',
      name: 'identity-vault',
      component: () => import('@/views/IdentityVaultView.vue'),
      meta: {
        label: 'Coffre email',
        allowedRoles: ['dpo', 'judicial_officer'],
        requiresAuthenticatedUser: true,
      },
    },
    {
      path: '/architecture',
      name: 'architecture',
      component: () => import('@/views/ArchitectureView.vue'),
      meta: {
        label: 'Architecture / sécurité',
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
        label: 'Accès refusé',
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
