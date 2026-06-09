import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import AdminBuilderView from '@/views/AdminBuilderView.vue'
import RespondentView from '@/views/RespondentView.vue'
import ModeratorView from '@/views/ModeratorView.vue'
import StatsView from '@/views/StatsView.vue'
import ArchitectureView from '@/views/ArchitectureView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/admin', component: AdminBuilderView },
      { path: '/questionnaire', component: RespondentView },
      { path: '/moderation', component: ModeratorView },
      { path: '/stats', component: StatsView },
      { path: '/architecture', component: ArchitectureView },
    ],
  })
}

describe('HomeView', () => {
  it('renders the CHPM prototype overview', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('Cahier des charges illustré')
    expect(wrapper.text()).toContain('Questionnaire adaptatif')
    expect(wrapper.text()).toContain('Administration no-code')
    expect(wrapper.text()).toContain('Pilotage statistique')
  })

  it('exposes the main demo navigation links', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router],
      },
    })

    const html = wrapper.html()
    expect(html).toContain('href="/admin"')
    expect(html).toContain('href="/questionnaire"')
    expect(html).toContain('href="/moderation"')
    expect(html).toContain('href="/stats"')
  })
})
