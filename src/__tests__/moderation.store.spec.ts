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
    const paperInvitation = { ...invitationFixture, id: 'invitation-paper', deliveryMode: 'paper_form' as const, maskedEmail: null }
    const refusalRecord = { ...invitationFixture, id: 'invitation-refusal', status: 'cancelled' as const, deliveryMode: 'refusal_record' as const, maskedEmail: null }
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/moderation/invitations')) {
        return jsonResponse({ invitations: [invitationFixture, submittedInvitation, blockedInvitation, paperInvitation, refusalRecord] })
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
    expect(store.totals).toEqual({
      sent: 4,
      approached: 5,
      submitted: 1,
      pending: 2,
      blocked: 2,
      onsiteTerminal: 1,
      paperForms: 1,
      noDigitalContact: 2,
      refused: 1,
    })
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


  it('submits paper responses and replaces the invitation with the locked result', async () => {
    const submittedPaperInvitation = {
      ...invitationFixture,
      id: 'invitation-paper',
      status: 'submitted' as const,
      deliveryMode: 'paper_form' as const,
      submittedAt: '2026-01-03T10:00:00.000Z',
      responseStatus: 'locked' as const,
    }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/moderation/invitations/invitation-paper/paper-entry')) {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init!.body))).toMatchObject({
          answers: [{ questionId: 'question-1', value: 2 }],
        })
        return jsonResponse({
          invitation: submittedPaperInvitation,
          submission: {
            id: 'submission-paper',
            publicCode: submittedPaperInvitation.publicCode,
            submittedAt: submittedPaperInvitation.submittedAt,
            answerCount: 1,
          },
          warnings: [],
        })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useModerationStore()
    store.invitations = [{ ...invitationFixture, id: 'invitation-paper', deliveryMode: 'paper_form' }]
    const response = await store.submitPaperResponses('invitation-paper', {
      answers: [{ questionId: 'question-1', value: 2 }],
    })

    expect(response.submission.answerCount).toBe(1)
    expect(store.invitations[0]).toEqual(submittedPaperInvitation)
    expect(store.status).toBe('ready')
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
