import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { TERMINAL_TOKEN_STORAGE_KEY, useTerminalStore } from '@/stores/terminal'

const terminalSessionPayload = {
  terminalDevice: {
    id: 'terminal-1',
    code: 'TERM-A',
    label: 'Tablette accueil',
    status: 'active',
    building: { id: 'building-1', code: 'A', label: 'Bâtiment A', city: 'Montréal', country: 'Canada', timezone: 'America/Montreal' },
    lastSeenAt: null,
    pendingInvitationCount: 1,
  },
  invitations: [
    {
      id: 'invitation-1',
      publicCode: 'TERM-0001',
      status: 'sent',
      deliveryMode: 'onsite_terminal',
      assistanceMode: 'none',
      maskedEmail: null,
      questionnaireVersionId: 'version-1',
      questionnaireTitle: 'Questionnaire terminal',
      versionLabel: '1.0',
      building: { id: 'building-1', code: 'A', label: 'Bâtiment A', city: 'Montréal', country: 'Canada', timezone: 'America/Montreal' },
      terminalDevice: null,
      terminalDispatchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sentAt: new Date().toISOString(),
      openedAt: null,
      startedAt: null,
      submittedAt: null,
      responseStatus: null,
    },
  ],
}

describe('useTerminalStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('loads and persists a terminal session token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(terminalSessionPayload), { status: 200 })))

    const store = useTerminalStore()
    await store.load('terminal-token')

    expect(store.status).toBe('ready')
    expect(store.terminalDevice?.id).toBe('terminal-1')
    expect(store.invitations).toHaveLength(1)
    expect(window.localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY)).toBe('terminal-token')
  })

  it('opens an assigned invitation and removes it from the local queue', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/terminal/session?token=terminal-token')) {
        return new Response(JSON.stringify(terminalSessionPayload), { status: 200 })
      }

      if (String(url).endsWith('/terminal/invitations/invitation-1/open')) {
        expect(JSON.parse(String(init?.body))).toEqual({ terminalToken: 'terminal-token' })
        return new Response(JSON.stringify({ invitation: terminalSessionPayload.invitations[0], accessToken: 'respondent-token', respondentAccessLink: '/r/respondent-token' }), { status: 200 })
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useTerminalStore()
    await store.load('terminal-token')
    const response = await store.openInvitation('invitation-1')

    expect(response.accessToken).toBe('respondent-token')
    expect(store.invitations).toHaveLength(0)
  })
})
