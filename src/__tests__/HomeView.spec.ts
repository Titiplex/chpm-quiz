import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import ProjectAdministrationView from '@/views/ProjectAdministrationView.vue'
import AdminBuilderView from '@/views/AdminBuilderView.vue'
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
        path: '/administration-projet',
        component: ProjectAdministrationView,
        meta: {
          label: 'Administration projet',
          allowedRoles: ['admin'],
          requiresAuthenticatedUser: true,
        },
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
          allowedRoles: ['moderator', 'site_manager'],
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
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/users/hierarchy')) {
        return new Response(JSON.stringify({
          hierarchy: {
            id: 'project-1',
            kind: 'project',
            label: 'Projet CHPM',
            subtitle: 'CHPM',
            role: null,
            isActive: null,
            isCurrentUser: false,
            children: [{
              id: 'project-administration-1',
              kind: 'team',
              label: 'Administration projet',
              subtitle: '1 administrateur projet',
              role: null,
              isActive: null,
              isCurrentUser: true,
              children: [{
                id: 'user-1',
                kind: 'project_admin',
                label: 'Alice Martin',
                subtitle: 'Administrateur projet / chercheur',
                role: 'admin',
                isActive: true,
                isCurrentUser: true,
                children: [],
              }],
            }],
          },
          scope: 'project',
          generatedAt: '2026-07-23T12:00:00.000Z',
        }), { status: 200 })
      }

      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
    }),
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

    expect(wrapper.text()).toContain('Espace de travail')
    expect(wrapper.text()).toContain('Administration projet')
    expect(wrapper.text()).toContain('Vos modules')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Hiérarchie du projet')
      expect(wrapper.text()).toContain('Projet CHPM')
    })
    expect(wrapper.text()).toContain('Statistiques')
    expect(wrapper.text()).not.toContain('Architecture')
  })
})
