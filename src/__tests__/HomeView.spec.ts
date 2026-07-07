import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import AdminBuilderView from '@/views/AdminBuilderView.vue'
import RespondentView from '@/views/RespondentView.vue'
import ModeratorView from '@/views/ModeratorView.vue'
import StatsView from '@/views/StatsView.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import LoginView from '@/views/LoginView.vue'
import { useSessionStore } from '@/stores/session'
import { allRoles } from '@shared/types/rbac'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        component: LoginView,
        meta: { label: 'Connexion', allowedRoles: allRoles, requiresAuthenticatedUser: false },
      },
      {
        path: '/',
        component: HomeView,
        meta: { label: 'Accueil', allowedRoles: allRoles, requiresAuthenticatedUser: true },
      },
      {
        path: '/admin',
        component: AdminBuilderView,
        meta: { label: 'Admin', allowedRoles: ['admin'], requiresAuthenticatedUser: true },
      },
      {
        path: '/questionnaire',
        component: RespondentView,
        meta: { label: 'Questionnaire', allowedRoles: allRoles, requiresAuthenticatedUser: true },
      },
      {
        path: '/moderation',
        component: ModeratorView,
        meta: {
          label: 'Modération',
          allowedRoles: ['admin', 'moderator'],
          requiresAuthenticatedUser: true,
        },
      },
      {
        path: '/stats',
        component: StatsView,
        meta: { label: 'Statistiques', allowedRoles: ['admin'], requiresAuthenticatedUser: true },
      },
      {
        path: '/403',
        component: AccessDeniedView,
        meta: { label: 'Accès refusé', allowedRoles: allRoles, requiresAuthenticatedUser: true },
      },
    ],
  })
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })),
  )
})

describe('HomeView', () => {
  it('renders the CHPM connected overview for an admin', async () => {
    const pinia = createPinia()
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [pinia, router],
      },
    })

    const session = useSessionStore()
    session.user = {
      id: 'user-1',
      email: 'admin@chpm.local',
      displayName: 'Alice Martin',
      role: 'admin',
      permissions: ['questionnaire:configure', 'statistics:read'],
      building: null,
    }

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Application connectée')
    expect(wrapper.text()).toContain('Constructeur de questionnaire')
    expect(wrapper.text()).toContain('Vos modules')
    expect(wrapper.text()).toContain('Statistiques')
    expect(wrapper.text()).not.toContain('Architecture')
  })
})
