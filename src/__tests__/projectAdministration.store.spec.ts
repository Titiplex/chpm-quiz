import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { apiRequest } from '@/services/api'
import { useProjectAdministrationStore } from '@/stores/projectAdministration'
import type { ApiSite, ApiSiteAdminUser } from '@shared/types/api'

vi.mock('@/services/api', () => ({
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

const organization = {
  id: 'org-1',
  code: 'CHPM',
  name: 'Centre hospitalier de Montfavet',
}

const siteA: ApiSite = {
  id: 'site-a',
  code: 'A',
  name: 'Site Alpha',
  organizationId: organization.id,
  organization,
  country: 'France',
  timezone: 'Europe/Paris',
}

const siteB: ApiSite = {
  ...siteA,
  id: 'site-b',
  code: 'B',
  name: 'Site Bêta',
}

const activeAdmin: ApiSiteAdminUser = {
  id: 'admin-1',
  email: 'responsable.alpha@example.test',
  displayName: 'Responsable Alpha',
  role: 'site_manager',
  roleLabel: 'Responsable de site',
  isActive: true,
  organizationId: organization.id,
  siteId: siteA.id,
  buildingId: null,
  site: { id: siteA.id, code: siteA.code, name: siteA.name },
  building: null,
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
}

const inactiveAdmin: ApiSiteAdminUser = {
  ...activeAdmin,
  id: 'admin-2',
  email: 'responsable.beta@example.test',
  displayName: 'Responsable Bêta',
  isActive: false,
  siteId: siteB.id,
  site: { id: siteB.id, code: siteB.code, name: siteB.name },
}

describe('useProjectAdministrationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiRequestMock.mockReset()
  })

  it('loads sites and site managers and exposes active/inactive groups', async () => {
    apiRequestMock
      .mockResolvedValueOnce({ sites: [siteA, siteB] })
      .mockResolvedValueOnce({
        users: [activeAdmin, inactiveAdmin],
        policy: {
          manageableRoles: ['site_manager'],
          scope: 'project',
          passwordReturnedOnce: true,
          forbiddenRoles: ['dpo'],
        },
      })

    const store = useProjectAdministrationStore()
    await store.fetchAdministration()

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/admin/sites')
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/admin/site-admins')
    expect(store.status).toBe('ready')
    expect(store.error).toBeNull()
    expect(store.sites).toEqual([siteA, siteB])
    expect(store.activeSiteAdmins).toEqual([activeAdmin])
    expect(store.inactiveSiteAdmins).toEqual([inactiveAdmin])
  })

  it.each([
    [new Error('API indisponible'), 'API indisponible'],
    ['network-failure', 'Chargement de l’administration projet impossible.'],
  ])('reports administration loading failures', async (reason, expectedMessage) => {
    apiRequestMock.mockRejectedValueOnce(reason)

    const store = useProjectAdministrationStore()
    await store.fetchAdministration()

    expect(store.status).toBe('error')
    expect(store.error).toBe(expectedMessage)
  })

  it('creates sites in alphabetical order and replaces an existing site', async () => {
    const updatedSiteB = { ...siteB, name: 'Site Bêta actualisé' }
    apiRequestMock
      .mockResolvedValueOnce({ site: siteA })
      .mockResolvedValueOnce({ site: updatedSiteB })

    const store = useProjectAdministrationStore()
    store.sites = [siteB]

    await expect(store.createSite({ code: siteA.code, name: siteA.name })).resolves.toEqual(siteA)
    expect(store.sites.map((site) => site.id)).toEqual(['site-a', 'site-b'])

    await expect(store.createSite({ code: siteB.code, name: updatedSiteB.name })).resolves.toEqual(updatedSiteB)
    expect(store.sites).toEqual([siteA, updatedSiteB])
    expect(store.status).toBe('ready')
  })

  it.each([
    [new Error('Code déjà utilisé'), 'Code déjà utilisé'],
    [false, 'Création du site impossible.'],
  ])('reports and rethrows site creation failures', async (reason, expectedMessage) => {
    apiRequestMock.mockRejectedValueOnce(reason)

    const store = useProjectAdministrationStore()
    await expect(store.createSite({ code: 'A', name: 'Site Alpha' })).rejects.toBe(reason)

    expect(store.status).toBe('error')
    expect(store.error).toBe(expectedMessage)
  })

  it('creates a site manager, stores the one-time password and clears notices', async () => {
    apiRequestMock.mockResolvedValueOnce({ user: activeAdmin, temporaryPassword: 'TempPass123!' })

    const store = useProjectAdministrationStore()
    store.lastRevokedSessionCount = 4

    await store.createSiteAdmin({
      email: activeAdmin.email,
      displayName: activeAdmin.displayName,
      siteId: siteA.id,
    })

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/site-admins', {
      method: 'POST',
      body: {
        email: activeAdmin.email,
        displayName: activeAdmin.displayName,
        siteId: siteA.id,
      },
    })
    expect(store.siteAdmins).toEqual([activeAdmin])
    expect(store.lastTemporaryPassword).toBe('TempPass123!')
    expect(store.lastTemporaryPasswordUser).toEqual(activeAdmin)
    expect(store.lastRevokedSessionCount).toBeNull()

    store.clearTemporaryPassword()
    expect(store.lastTemporaryPassword).toBeNull()
    expect(store.lastTemporaryPasswordUser).toBeNull()

    store.lastRevokedSessionCount = 2
    store.clearRevocationNotice()
    expect(store.lastRevokedSessionCount).toBeNull()
  })

  it('updates an existing manager and handles an omitted temporary password', async () => {
    const renamedAdmin = { ...activeAdmin, displayName: 'Responsable Alpha renommé' }
    apiRequestMock
      .mockResolvedValueOnce({ user: activeAdmin })
      .mockResolvedValueOnce({ user: renamedAdmin })

    const store = useProjectAdministrationStore()
    await store.createSiteAdmin({
      email: activeAdmin.email,
      displayName: activeAdmin.displayName,
      siteId: siteA.id,
    })
    expect(store.lastTemporaryPassword).toBeNull()

    store.lastRevokedSessionCount = 7
    await store.updateSiteAdmin(activeAdmin.id, { displayName: renamedAdmin.displayName })

    expect(apiRequestMock).toHaveBeenLastCalledWith(`/admin/site-admins/${activeAdmin.id}`, {
      method: 'PATCH',
      body: { displayName: renamedAdmin.displayName },
    })
    expect(store.siteAdmins).toEqual([renamedAdmin])
    expect(store.lastRevokedSessionCount).toBeNull()
  })

  it('resets a manager password and replaces the existing manager', async () => {
    const resetAdmin = { ...activeAdmin, updatedAt: '2026-07-02T08:00:00.000Z' }
    apiRequestMock.mockResolvedValueOnce({ user: resetAdmin, temporaryPassword: 'ResetPass456!' })

    const store = useProjectAdministrationStore()
    store.siteAdmins = [activeAdmin]
    store.lastRevokedSessionCount = 3

    await store.resetSiteAdminPassword(activeAdmin.id)

    expect(apiRequestMock).toHaveBeenCalledWith(`/admin/site-admins/${activeAdmin.id}/reset-password`, {
      method: 'POST',
    })
    expect(store.siteAdmins).toEqual([resetAdmin])
    expect(store.lastTemporaryPassword).toBe('ResetPass456!')
    expect(store.lastTemporaryPasswordUser).toEqual(resetAdmin)
    expect(store.lastRevokedSessionCount).toBeNull()
  })

  it('revokes sessions and exposes the number of invalidated sessions', async () => {
    const revokedAdmin = { ...activeAdmin, updatedAt: '2026-07-03T08:00:00.000Z' }
    apiRequestMock.mockResolvedValueOnce({ user: revokedAdmin, revokedSessionCount: 5 })

    const store = useProjectAdministrationStore()
    store.siteAdmins = [activeAdmin]

    await store.revokeSiteAdminSessions(activeAdmin.id)

    expect(apiRequestMock).toHaveBeenCalledWith(`/admin/site-admins/${activeAdmin.id}/revoke-sessions`, {
      method: 'POST',
    })
    expect(store.siteAdmins).toEqual([revokedAdmin])
    expect(store.lastRevokedSessionCount).toBe(5)
    expect(store.status).toBe('ready')
  })

  it.each([
    ['createSiteAdmin', new Error('Création refusée'), 'Création du responsable de site impossible.'],
    ['updateSiteAdmin', 'update-failed', 'Mise à jour du responsable de site impossible.'],
    ['resetSiteAdminPassword', new Error('Réinitialisation refusée'), 'Réinitialisation du mot de passe impossible.'],
    ['revokeSiteAdminSessions', 'revoke-failed', 'Révocation des sessions impossible.'],
  ] as const)('reports and rethrows %s failures', async (action, reason, fallbackMessage) => {
    apiRequestMock.mockRejectedValueOnce(reason)
    const store = useProjectAdministrationStore()

    let operation: Promise<unknown>
    if (action === 'createSiteAdmin') {
      operation = store.createSiteAdmin({
        email: activeAdmin.email,
        displayName: activeAdmin.displayName,
        siteId: siteA.id,
      })
    } else if (action === 'updateSiteAdmin') {
      operation = store.updateSiteAdmin(activeAdmin.id, { isActive: false })
    } else if (action === 'resetSiteAdminPassword') {
      operation = store.resetSiteAdminPassword(activeAdmin.id)
    } else {
      operation = store.revokeSiteAdminSessions(activeAdmin.id)
    }

    await expect(operation).rejects.toBe(reason)
    expect(store.status).toBe('error')
    expect(store.error).toBe(reason instanceof Error ? reason.message : fallbackMessage)
  })
})
