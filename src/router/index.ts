import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

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
      allowedRoles: ['admin'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/moderation',
    name: 'moderation',
    component: () => import('@/views/ModeratorView.vue'),
    meta: {
      label: 'Modération',
      allowedRoles: ['admin', 'moderator'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/questionnaire',
    name: 'questionnaire',
    component: () => import('@/views/RespondentView.vue'),
    meta: {
      label: 'Questionnaire',
      allowedRoles: [...allRoles],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: {
      label: 'Statistiques',
      allowedRoles: ['admin'],
      requiresAuthenticatedUser: true,
    },
  },
  {
    path: '/architecture',
    name: 'architecture',
    component: () => import('@/views/ArchitectureView.vue'),
    meta: {
      label: 'Architecture / sécurité',
      allowedRoles: ['admin'],
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
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const session = useSessionStore()
  const allowedRoles = to.meta.allowedRoles

  if (to.name === 'forbidden') {
    return true
  }

  if (!hasRoleAccess(session.currentRole, allowedRoles)) {
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
