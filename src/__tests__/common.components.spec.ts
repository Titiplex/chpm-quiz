import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useSessionStore } from '@/stores/session'
import { adminUserFixture, moderatorUserFixture } from './fixtures/api'

describe('common display components', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders KPI detail only when provided and applies the requested tone class', () => {
    const detailed = mount(KpiCard, {
      props: { label: 'Soumissions', value: '42', detail: '+12 %', tone: 'success' },
    })
    const compact = mount(KpiCard, {
      props: { label: 'Invitations', value: '10' },
    })

    expect(detailed.text()).toContain('Soumissions')
    expect(detailed.text()).toContain('+12 %')
    expect(detailed.find('p').classes()).toContain('text-success')
    expect(compact.find('p').exists()).toBe(false)
  })

  it('renders optional page header description, badge and action slot', () => {
    const wrapper = mount(PageHeader, {
      props: {
        eyebrow: 'Pilotage',
        title: 'Statistiques',
        description: 'Vue agrégée pseudonymisée',
        badge: 'Préprod',
      },
      slots: {
        actions: '<button type="button">Exporter</button>',
      },
    })

    expect(wrapper.text()).toContain('Pilotage')
    expect(wrapper.text()).toContain('Statistiques')
    expect(wrapper.text()).toContain('Vue agrégée pseudonymisée')
    expect(wrapper.text()).toContain('Préprod')
    expect(wrapper.text()).toContain('Exporter')
  })

  it('hides role gate info when anonymous and displays concrete building scope for active users', async () => {
    const pinia = createPinia()
    const anonymous = mount(RoleGateInfo, { global: { plugins: [pinia] } })

    expect(anonymous.text()).toBe('')

    const session = useSessionStore(pinia)
    session.user = moderatorUserFixture
    await anonymous.vm.$nextTick()

    expect(anonymous.text()).toContain('Rôle actif')
    expect(anonymous.text()).toContain('Modérateur bâtiment')
    expect(anonymous.text()).toContain('Marc Dubois')
    expect(anonymous.text()).toContain('Périmètre : Bâtiment A.')
  })

  it('falls back to the role profile scope when the user has no concrete building', async () => {
    const pinia = createPinia()
    const wrapper = mount(RoleGateInfo, { global: { plugins: [pinia] } })
    const session = useSessionStore(pinia)
    session.user = adminUserFixture
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Périmètre : Tous les sites et tous les bâtiments.')
  })
})
