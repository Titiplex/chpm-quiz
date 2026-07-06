import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import { useSessionStore } from '@/stores/session'
import { adminUserFixture } from './fixtures/api'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<section>Accueil</section>' } },
      { path: '/login', component: { template: '<section>Login</section>' } },
      { path: '/admin', component: { template: '<section>Admin</section>' } },
    ],
  })
}

describe('layout components', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders connected navigation only for authenticated users', async () => {
    const pinia = createPinia()
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia, router],
      },
    })

    expect(wrapper.text()).toContain('CHPM Survey')
    expect(wrapper.text()).toContain('Produit connecté')
    expect(wrapper.text()).toContain('Connexion')
    expect(wrapper.text()).not.toContain('Admin')

    const session = useSessionStore(pinia)
    session.user = adminUserFixture
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('Déconnexion')
  })

  it('pushes to login after logout from the user menu', async () => {
    const pinia = createPinia()
    const router = makeRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const session = useSessionStore(pinia)
    session.user = adminUserFixture
    session.logout = vi.fn(async () => {
      session.user = null
      session.status = 'anonymous'
    })

    const wrapper = mount(UserMenu, {
      global: {
        plugins: [pinia, router],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain('Alice Martin')
    await wrapper.get('button').trigger('click')

    expect(session.logout).toHaveBeenCalledOnce()
    expect(pushSpy).toHaveBeenCalledWith('/login')
  })

  it('renders the login link when no user is authenticated', () => {
    const wrapper = mount(UserMenu, {
      global: {
        plugins: [createPinia(), makeRouter()],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain('Connexion')
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/login')
  })
})
