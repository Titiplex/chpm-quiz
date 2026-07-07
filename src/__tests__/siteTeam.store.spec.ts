import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSiteTeamStore } from '@/stores/siteTeam'
import { buildingFixture } from './fixtures/api'
import type { ApiSiteTeamUser } from '@shared/types/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

const moderatorFixture: ApiSiteTeamUser = {
  id: 'mod-1',
  email: 'mod@example.test',
  displayName: 'Modérateur A',
  role: 'moderator',
  roleLabel: 'Modérateur bâtiment',
  isActive: true,
  organizationId: 'org-1',
  siteId: 'site-1',
  buildingId: buildingFixture.id,
  site: { id: 'site-1', code: 'S1', name: 'Site 1' },
  building: buildingFixture,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useSiteTeamStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads scoped site team users and computes moderator groups', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      users: [moderatorFixture, { ...moderatorFixture, id: 'mod-2', isActive: false }],
      policy: { manageableRoles: ['moderator'], scope: 'site', passwordReturnedOnce: true },
    })))

    const store = useSiteTeamStore()
    await store.fetchTeam()

    expect(store.status).toBe('ready')
    expect(store.activeModerators).toHaveLength(1)
    expect(store.inactiveModerators).toHaveLength(1)
  })

  it('creates moderators and stores one-time temporary passwords', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain('/users/site-moderators')
      expect(init?.method).toBe('POST')
      return jsonResponse({ user: moderatorFixture, temporaryPassword: 'TempPass123!', temporaryPasswordGenerated: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSiteTeamStore()
    await store.createModerator({ email: 'mod@example.test', displayName: 'Modérateur A', buildingId: buildingFixture.id })

    expect(store.users).toEqual([moderatorFixture])
    expect(store.lastTemporaryPassword).toBe('TempPass123!')
    expect(store.lastTemporaryPasswordUser).toEqual(moderatorFixture)
  })

  it('updates and resets moderators through scoped endpoints', async () => {
    const disabled = { ...moderatorFixture, isActive: false }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/users/site-moderators/mod-1/reset-password')) {
        expect(init?.method).toBe('POST')
        return jsonResponse({ user: moderatorFixture, temporaryPassword: 'ResetPass123!' })
      }
      if (String(url).endsWith('/users/site-moderators/mod-1')) {
        expect(init?.method).toBe('PATCH')
        return jsonResponse({ user: disabled })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSiteTeamStore()
    store.users = [moderatorFixture]

    await store.updateModerator('mod-1', { isActive: false })
    expect(store.users[0]?.isActive).toBe(false)

    await store.resetModeratorPassword('mod-1')
    expect(store.users[0]?.isActive).toBe(true)
    expect(store.lastTemporaryPassword).toBe('ResetPass123!')
  })
})
