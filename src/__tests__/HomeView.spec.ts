import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import AdminBuilderView from '@/views/AdminBuilderView.vue'
import RespondentView from '@/views/RespondentView.vue'
import ModeratorView from '@/views/ModeratorView.vue'
import StatsView from '@/views/StatsView.vue'
import ArchitectureView from '@/views/ArchitectureView.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import { allRoles } from '@shared/types/rbac'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView, meta: { label: 'Accueil', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
      { path: '/admin', component: AdminBuilderView, meta: { label: 'Admin', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
      { path: '/questionnaire', component: RespondentView, meta: { label: 'Questionnaire', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
      { path: '/moderation', component: ModeratorView, meta: { label: 'Modération', allowedRoles: ['admin', 'moderator'], requiresAuthenticatedUser: true } },
      { path: '/stats', component: StatsView, meta: { label: 'Statistiques', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
      { path: '/architecture', component: ArchitectureView, meta: { label: 'Architecture', allowedRoles: ['admin'], requiresAuthenticatedUser: true } },
      { path: '/403', component: AccessDeniedView, meta: { label: 'Accès refusé', allowedRoles: allRoles, requiresAuthenticatedUser: true } },
    ],
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('HomeView', () => {
  it('renders the CHPM prototype overview', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.text()).toContain('Cahier des charges illustré')
    expect(wrapper.text()).toContain('Questionnaire adaptatif')
    expect(wrapper.text()).toContain('Administration no-code')
    expect(wrapper.text()).toContain('Pilotage statistique')
    expect(wrapper.text()).toContain('Utilisateur simulé')
  })

  it('exposes the main demo navigation links', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    const html = wrapper.html()
    expect(html).toContain('href="/admin"')
    expect(html).toContain('href="/questionnaire"')
    expect(html).toContain('href="/moderation"')
    expect(html).toContain('href="/stats"')
  })
})
