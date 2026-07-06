import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSessionStore } from '@/stores/session'
import { adminUserFixture, moderatorUserFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores the authenticated profile and exposes role-derived navigation and permissions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ user: adminUserFixture })))

    const store = useSessionStore()
    await store.restore()

    expect(store.status).toBe('authenticated')
    expect(store.isBootstrapped).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.currentRole).toBe('admin')
    expect(store.currentProfile.label).toBe('Administrateur global')
    expect(store.visibleNavigation.map((item) => item.to)).toContain('/admin')
    expect(store.hasPermission('questionnaire:configure')).toBe(true)
    expect(store.hasPermission('judicial:executeAccess')).toBe(false)
  })

  it('keeps anonymous state on a missing backend session without surfacing a user-facing error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, 401)))

    const store = useSessionStore()
    await store.restore()
    await store.restore()

    expect(store.status).toBe('anonymous')
    expect(store.user).toBeNull()
    expect(store.error).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('logs in with submitted credentials and resets state on failed logout', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/auth/login')) {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body))).toEqual({ email: 'moderateur@chpm.local', password: 'secret' })
        return jsonResponse({ user: moderatorUserFixture })
      }

      if (String(url).endsWith('/auth/logout')) {
        return jsonResponse({ message: 'Interdit' }, 403)
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSessionStore()
    await store.login({ email: 'moderateur@chpm.local', password: 'secret' })

    expect(store.status).toBe('authenticated')
    expect(store.user?.building?.label).toBe('Bâtiment A')

    await store.logout()

    expect(store.status).toBe('anonymous')
    expect(store.user).toBeNull()
    expect(store.error).toBe('Interdit')
  })

  it('propagates login errors while returning to anonymous state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Identifiants invalides' }, 401)))

    const store = useSessionStore()

    await expect(store.login({ email: 'bad@example.test', password: 'bad' })).rejects.toMatchObject({
      message: 'Identifiants invalides',
    })
    expect(store.status).toBe('anonymous')
    expect(store.user).toBeNull()
    expect(store.error).toBe('Identifiants invalides')
  })
})
