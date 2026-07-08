import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useModerationStore } from '@/stores/moderation'
import { invitationFixture, terminalDeviceFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useModerationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('refreshes invitations and terminal devices and computes operational totals', async () => {
    const submittedInvitation = { ...invitationFixture, id: 'invitation-submitted', status: 'submitted' as const }
    const blockedInvitation = { ...invitationFixture, id: 'invitation-expired', status: 'expired' as const, deliveryMode: 'onsite_terminal' as const }
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/moderation/invitations')) {
        return jsonResponse({ invitations: [invitationFixture, submittedInvitation, blockedInvitation] })
      }
      if (String(url).endsWith('/moderation/terminal-devices')) {
        return jsonResponse({ terminalDevices: [terminalDeviceFixture] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useModerationStore()
    await store.refresh()

    expect(store.status).toBe('ready')
    expect(store.terminalDevices).toEqual([terminalDeviceFixture])
    expect(store.totals).toEqual({ sent: 3, submitted: 1, pending: 1, blocked: 1, onsiteTerminal: 1, sms: 0 })
  })

  it('creates invitations, tracks launch links and refreshes terminal inventory', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/moderation/invitations')) {
        expect(init?.method).toBe('POST')
        expect(init).toBeDefined()
        expect(JSON.parse(String(init!.body))).toMatchObject({ questionnaireVersionId: 'version-1', buildingId: 'building-1' })
        return jsonResponse({
          invitation: invitationFixture,
          accessToken: 'respondent-token',
          devAccessLink: '/r/respondent-token',
          terminalDispatchLink: '/terminal/dispatch',
        })
      }
      if (String(url).endsWith('/moderation/terminal-devices')) {
        return jsonResponse({ terminalDevices: [terminalDeviceFixture] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useModerationStore()
    await store.createInvitation({ questionnaireVersionId: 'version-1', buildingId: 'building-1' })

    expect(store.status).toBe('ready')
    expect(store.invitations).toEqual([invitationFixture])
    expect(store.lastCreatedLink).toBe('/r/respondent-token')
    expect(store.lastCreatedTerminalLink).toBe('/terminal/dispatch')
    expect(store.lastCreatedInvitation).toEqual(invitationFixture)
  })

  it('registers terminals and updates an invitation after resend', async () => {
    const resentInvitation = { ...invitationFixture, sentAt: '2026-01-02T09:00:00.000Z' }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/moderation/terminal-devices') && init?.method === 'POST') {
        return jsonResponse({
          terminalDevice: terminalDeviceFixture,
          terminalAccessToken: 'terminal-token',
          terminalLaunchLink: '/terminal/terminal-token',
        })
      }

      if (String(url).endsWith('/moderation/invitations/invitation-1/resend')) {
        return jsonResponse({ invitation: resentInvitation })
      }

      if (String(url).endsWith('/moderation/terminal-devices')) {
        return jsonResponse({ terminalDevices: [terminalDeviceFixture] })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useModerationStore()
    await store.registerTerminalDevice({ buildingId: 'building-1', label: 'Tablette accueil' })
    store.invitations = [invitationFixture]
    await store.resendInvitation('invitation-1')

    expect(store.lastRegisteredTerminalLink).toBe('/terminal/terminal-token')
    expect(store.terminalDevices).toEqual([terminalDeviceFixture])
    expect(store.invitations[0]?.sentAt).toBe('2026-01-02T09:00:00.000Z')
  })

  it('sets error states on failed reads and mutations', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Service indisponible' }, 503)))

    const store = useModerationStore()
    await store.fetchInvitations()

    expect(store.status).toBe('error')
    expect(store.error).toBe('Service indisponible')

    await expect(store.createInvitation({ questionnaireVersionId: 'version-1', buildingId: 'building-1' })).rejects.toMatchObject({
      message: 'Service indisponible',
    })
    expect(store.status).toBe('error')
  })
})
