import { createRouter, createWebHashHistory, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import { allRoles, hasRoleAccess, type UserRole } from '@shared/types/rbac'

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

const router = createRouter({
  history: import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
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
