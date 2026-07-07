import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import App from '../App.vue'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import AdminBuilderView from '../views/AdminBuilderView.vue'
import ModeratorView from '../views/ModeratorView.vue'
import RespondentView from '../views/RespondentView.vue'
import StatsView from '../views/StatsView.vue'
import AccessDeniedView from '../views/AccessDeniedView.vue'
import { allRoles } from '@shared/types/rbac'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })),
  )
})

describe('App', () => {
  it('mounts the connected shell with login screen', async () => {
    const router = createRouter({
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
          path: '/moderation',
          component: ModeratorView,
          meta: {
            label: 'Modération',
            allowedRoles: ['admin', 'moderator'],
            requiresAuthenticatedUser: true,
          },
        },
        {
          path: '/questionnaire',
          component: RespondentView,
          meta: { label: 'Questionnaire', allowedRoles: allRoles, requiresAuthenticatedUser: true },
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

    router.push('/login')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('CHPM Survey')
    expect(wrapper.text()).toContain('Produit connecté')
    expect(wrapper.text()).toContain('Connexion réelle à l’API centrale')
    expect(wrapper.text()).not.toContain('admin@chpm.local')
  })
})
