import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'

import { createAuthorizationGuard, createConnectedRoutes, createStaticPagesRoutes } from '@/router'
import { useSessionStore } from '@/stores/session'
import { adminUserFixture, moderatorUserFixture } from './fixtures/api'

function route(partial: Partial<RouteLocationNormalized>): RouteLocationNormalized {
  return {
    name: partial.name ?? 'home',
    fullPath: partial.fullPath ?? '/',
    path: partial.path ?? '/',
    params: partial.params ?? {},
    query: partial.query ?? {},
    hash: partial.hash ?? '',
    matched: partial.matched ?? [],
    redirectedFrom: partial.redirectedFrom,
    meta: partial.meta ?? { label: 'Accueil', allowedRoles: ['admin'], requiresAuthenticatedUser: true },
  } as RouteLocationNormalized
}

describe('router configuration and guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('declares connected production routes, including terminal administration and public terminal launch', () => {
    const routes = createConnectedRoutes()

    expect(routes.map((candidate) => candidate.path)).toEqual([
      '/login',
      '/',
      '/admin',
      '/moderation',
      '/questionnaire',
      '/r/:token',
      '/stats',
      '/terminaux',
      '/terminal/:terminalToken?',
      '/rgpd',
      '/coffre-email',
      '/403',
      '/:pathMatch(.*)*',
    ])
    expect(routes.find((candidate) => candidate.path === '/r/:token')?.meta?.requiresAuthenticatedUser).toBe(false)
    expect(routes.find((candidate) => candidate.path === '/terminaux')?.meta?.allowedRoles).toContain('technical_admin')
  })

  it('keeps GitHub Pages static routes unauthenticated and redirects unknown paths to moderation', () => {
    const routes = createStaticPagesRoutes()

    expect(routes.find((candidate) => candidate.path === '/moderation')?.meta?.requiresAuthenticatedUser).toBe(false)
    expect(routes.find((candidate) => candidate.path === '/r/:token')?.redirect).toBe('/questionnaire')
    expect(routes[routes.length - 1]?.redirect).toBe('/moderation')
  })

  it('lets the static demo guard pass without reading the backend session', async () => {
    vi.stubGlobal('fetch', vi.fn())

    await expect(createAuthorizationGuard(true)(route({}))).resolves.toBe(true)

    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects anonymous users from private pages to login with the original path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })))

    await expect(createAuthorizationGuard(false)(route({ fullPath: '/stats?x=1', path: '/stats' }))).resolves.toEqual({
      path: '/login',
      query: { redirect: '/stats?x=1' },
    })
  })

  it('redirects an authenticated user away from login to their role default path', async () => {
    const session = useSessionStore()
    session.user = moderatorUserFixture
    session.status = 'authenticated'
    session.isBootstrapped = true

    await expect(createAuthorizationGuard(false)(route({
      name: 'login',
      fullPath: '/login',
      path: '/login',
      meta: { label: 'Connexion', allowedRoles: ['admin'], requiresAuthenticatedUser: false },
    }))).resolves.toBe('/moderation')
  })

  it('blocks authenticated users when their role is outside the route ACL', async () => {
    const session = useSessionStore()
    session.user = moderatorUserFixture
    session.status = 'authenticated'
    session.isBootstrapped = true

    await expect(createAuthorizationGuard(false)(route({
      fullPath: '/admin',
      path: '/admin',
      meta: { label: 'Admin', allowedRoles: ['admin'], requiresAuthenticatedUser: true },
    }))).resolves.toEqual({
      path: '/403',
      query: { from: '/admin', role: 'moderator', fallback: '/moderation' },
    })
  })

  it('allows forbidden page and authorized private navigation', async () => {
    const session = useSessionStore()
    session.user = adminUserFixture
    session.status = 'authenticated'
    session.isBootstrapped = true

    await expect(createAuthorizationGuard(false)(route({ name: 'forbidden', path: '/403', fullPath: '/403' }))).resolves.toBe(true)
    await expect(createAuthorizationGuard(false)(route({ path: '/admin', fullPath: '/admin' }))).resolves.toBe(true)
  })
})
