import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import App from '../App.vue'
import HomeView from '../views/HomeView.vue'
import AdminBuilderView from '../views/AdminBuilderView.vue'
import ModeratorView from '../views/ModeratorView.vue'
import RespondentView from '../views/RespondentView.vue'
import StatsView from '../views/StatsView.vue'
import ArchitectureView from '../views/ArchitectureView.vue'

describe('App', () => {
  it('mounts the prototype shell', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: HomeView },
        { path: '/admin', component: AdminBuilderView },
        { path: '/moderation', component: ModeratorView },
        { path: '/questionnaire', component: RespondentView },
        { path: '/stats', component: StatsView },
        { path: '/architecture', component: ArchitectureView },
      ],
    })

    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('CHPM Survey')
    expect(wrapper.text()).toContain('Prototype front')
    expect(wrapper.text()).toContain('Statistiques')
  })
})
