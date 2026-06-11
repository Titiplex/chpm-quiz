import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import App from '../App.vue'
import HomeView from '../views/HomeView.vue'
import AdminBuilderView from '../views/AdminBuilderView.vue'
import ModeratorView from '../views/ModeratorView.vue'
import RespondentView from '../views/RespondentView.vue'
import StatsView from '../views/StatsView.vue'
import ArchitectureView from '../views/ArchitectureView.vue'
import AccessDeniedView from '../views/AccessDeniedView.vue'
import { allRoles } from '@shared/types/rbac'

beforeEach(() => {
  window.localStorage.clear()
})

describe('App', () => {
  it('mounts the prototype shell with role navigation', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: HomeView, meta: { label: 'Accueil', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
        { path: '/admin', component: AdminBuilderView, meta: { label: 'Admin', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
        { path: '/moderation', component: ModeratorView, meta: { label: 'Modération', allowedRoles: ['admin', 'moderator'], requiresAuthenticatedUser: true } },
        { path: '/questionnaire', component: RespondentView, meta: { label: 'Questionnaire', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
        { path: '/stats', component: StatsView, meta: { label: 'Statistiques', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
        { path: '/architecture', component: ArchitectureView, meta: { label: 'Architecture', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
        { path: '/403', component: AccessDeniedView, meta: { label: 'Accès refusé', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
      ],
    })

    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('CHPM Survey')
    expect(wrapper.text()).toContain('Prototype front typé')
    expect(wrapper.text()).toContain('Rôle démo')
    expect(wrapper.text()).toContain('Statistiques')
  })
})
