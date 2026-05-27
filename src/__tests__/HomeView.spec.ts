import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import QuestionView from '@/views/QuestionView.vue'

// Create a mocked router instance for testing
const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/question', component: QuestionView }],
})

describe('HomeView', () => {
  it('should render the home view', () => {
    const wrapper = mount(HomeView)
    expect(wrapper.find('h2').text()).toBe('Welcome to the Vigil Quiz')
    expect(wrapper.find('p').text()).toBe(
      'Get ready to learn more about this amazing company through our interactive quiz!',
    )
    expect(wrapper.find('button').text()).toBe('Start')
  })
  it('should navigate to the question route when the button is clicked', async () => {
    const wrapper = mount(HomeView, {
      global: {
        mocks: {
          $router: router,
        },
      },
    })

    // Simulate a click on the button
    wrapper.find('button').trigger('click')

    // Wait for the navigation to complete
    await router.isReady()

    // Check if the router was navigated to the '/question' route
    expect(router.currentRoute.value.path).toBe('/question')
  })
})
