import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useTerminalAdminStore } from '@/stores/terminalAdmin'
import type { ApiTerminalDevice } from '@shared/types/api'

const terminalDevice: ApiTerminalDevice = {
  id: 'terminal-1',
  code: 'TERM-A',
  label: 'Tablette accueil',
  status: 'active',
  building: { id: 'building-1', code: 'A', label: 'Bâtiment A', city: 'Montréal', country: 'Canada', timezone: 'America/Montreal' },
  lastSeenAt: null,
  pendingInvitationCount: 2,
}

describe('useTerminalAdminStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('loads terminal inventory and computes operational totals', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ terminalDevices: [terminalDevice] }), { status: 200 })))

    const store = useTerminalAdminStore()
    await store.fetchTerminalDevices()

    expect(store.status).toBe('ready')
    expect(store.terminalDevices).toHaveLength(1)
    expect(store.totals.active).toBe(1)
    expect(store.totals.pendingInvitations).toBe(2)
  })

  it('creates a terminal and exposes the one-time launch link', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe('http://localhost:3000/api/terminal-devices')
      expect(init?.method).toBe('POST')
      return new Response(JSON.stringify({ terminalDevice, terminalAccessToken: 'terminal-token', terminalLaunchLink: '/terminal/terminal-token' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useTerminalAdminStore()
    const response = await store.createTerminalDevice({ buildingId: 'building-1', label: 'Tablette accueil' })

    expect(response.terminalAccessToken).toBe('terminal-token')
    expect(store.lastLaunchLink).toBe('/terminal/terminal-token')
    expect(store.lastLaunchLinkAction).toBe('created')
    expect(store.lastLaunchLinkDevice?.id).toBe('terminal-1')
    expect(store.terminalDevices[0]?.id).toBe('terminal-1')
  })

  it('updates and revokes an existing terminal', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/terminal-devices/terminal-1')) {
        return new Response(JSON.stringify({ terminalDevice: { ...terminalDevice, status: 'paused' } }), { status: 200 })
      }

      if (String(url).endsWith('/terminal-devices/terminal-1/revoke')) {
        return new Response(JSON.stringify({ terminalDevice: { ...terminalDevice, status: 'revoked' } }), { status: 200 })
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useTerminalAdminStore()
    store.terminalDevices = [terminalDevice]

    await store.updateTerminalDevice('terminal-1', { status: 'paused' })
    expect(store.terminalDevices[0]?.status).toBe('paused')

    await store.revokeTerminalDevice('terminal-1')
    expect(store.terminalDevices[0]?.status).toBe('revoked')
  })

  it('regenerates the terminal launch link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      terminalDevice,
      terminalAccessToken: 'terminal-token-2',
      terminalLaunchLink: '/terminal/terminal-token-2',
    }), { status: 200 })))

    const store = useTerminalAdminStore()
    store.terminalDevices = [terminalDevice]
    const response = await store.regenerateTerminalToken('terminal-1')

    expect(response.terminalAccessToken).toBe('terminal-token-2')
    expect(store.lastLaunchLink).toBe('/terminal/terminal-token-2')
    expect(store.lastLaunchLinkAction).toBe('regenerated')
    expect(store.lastLaunchLinkDevice?.id).toBe('terminal-1')

    store.clearLastLaunchLink()
    expect(store.lastLaunchLink).toBeNull()
    expect(store.lastLaunchLinkAction).toBeNull()
    expect(store.lastLaunchLinkDevice).toBeNull()
  })
})
