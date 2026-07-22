import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiSite,
  ApiSiteAdminUser,
  CreateSiteRequest,
  CreateSiteAdminRequest,
  RevokeSessionsResponse,
  SiteMutationResponse,
  SiteAdminMutationResponse,
  SiteAdminsResponse,
  SitesResponse,
  UpdateSiteAdminRequest,
} from '@shared/types/api'

type ProjectAdministrationStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export const useProjectAdministrationStore = defineStore('projectAdministration', () => {
  const sites = ref<ApiSite[]>([])
  const siteAdmins = ref<ApiSiteAdminUser[]>([])
  const status = ref<ProjectAdministrationStatus>('idle')
  const error = ref<string | null>(null)
  const lastTemporaryPassword = ref<string | null>(null)
  const lastTemporaryPasswordUser = ref<ApiSiteAdminUser | null>(null)
  const lastRevokedSessionCount = ref<number | null>(null)

  const activeSiteAdmins = computed(() => siteAdmins.value.filter((user) => user.isActive))
  const inactiveSiteAdmins = computed(() => siteAdmins.value.filter((user) => !user.isActive))

  async function fetchAdministration(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const [siteResponse, adminResponse] = await Promise.all([
        apiRequest<SitesResponse>('/admin/sites'),
        apiRequest<SiteAdminsResponse>('/admin/site-admins'),
      ])
      sites.value = siteResponse.sites
      siteAdmins.value = adminResponse.users
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement de l’administration projet impossible.'
    }
  }


  async function createSite(payload: CreateSiteRequest): Promise<ApiSite> {
    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<SiteMutationResponse>('/admin/sites', {
        method: 'POST',
        body: payload,
      })
      upsertSite(response.site)
      status.value = 'ready'
      return response.site
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création du site impossible.'
      throw caught
    }
  }

  async function createSiteAdmin(payload: CreateSiteAdminRequest): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastTemporaryPassword.value = null
    lastTemporaryPasswordUser.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteAdminMutationResponse>('/admin/site-admins', {
        method: 'POST',
        body: payload,
      })
      upsertSiteAdmin(response.user)
      lastTemporaryPassword.value = response.temporaryPassword ?? null
      lastTemporaryPasswordUser.value = response.user
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création du responsable de site impossible.'
      throw caught
    }
  }

  async function updateSiteAdmin(id: string, payload: UpdateSiteAdminRequest): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteAdminMutationResponse>(`/admin/site-admins/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      upsertSiteAdmin(response.user)
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Mise à jour du responsable de site impossible.'
      throw caught
    }
  }

  async function resetSiteAdminPassword(id: string): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastTemporaryPassword.value = null
    lastTemporaryPasswordUser.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteAdminMutationResponse>(`/admin/site-admins/${id}/reset-password`, {
        method: 'POST',
      })
      upsertSiteAdmin(response.user)
      lastTemporaryPassword.value = response.temporaryPassword ?? null
      lastTemporaryPasswordUser.value = response.user
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Réinitialisation du mot de passe impossible.'
      throw caught
    }
  }

  async function revokeSiteAdminSessions(id: string): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<RevokeSessionsResponse>(`/admin/site-admins/${id}/revoke-sessions`, {
        method: 'POST',
      })
      upsertSiteAdmin(response.user as ApiSiteAdminUser)
      lastRevokedSessionCount.value = response.revokedSessionCount
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Révocation des sessions impossible.'
      throw caught
    }
  }

  function clearTemporaryPassword(): void {
    lastTemporaryPassword.value = null
    lastTemporaryPasswordUser.value = null
  }

  function clearRevocationNotice(): void {
    lastRevokedSessionCount.value = null
  }


  function upsertSite(site: ApiSite): void {
    const index = sites.value.findIndex((candidate) => candidate.id === site.id)
    if (index === -1) {
      sites.value = [...sites.value, site].sort((left, right) => left.name.localeCompare(right.name, 'fr'))
      return
    }

    sites.value = sites.value.map((candidate) => candidate.id === site.id ? site : candidate)
  }

  function upsertSiteAdmin(user: ApiSiteAdminUser): void {
    const index = siteAdmins.value.findIndex((candidate) => candidate.id === user.id)
    if (index === -1) {
      siteAdmins.value = [user, ...siteAdmins.value]
      return
    }

    siteAdmins.value = siteAdmins.value.map((candidate) => candidate.id === user.id ? user : candidate)
  }

  return {
    sites,
    siteAdmins,
    status,
    error,
    lastTemporaryPassword,
    lastTemporaryPasswordUser,
    lastRevokedSessionCount,
    activeSiteAdmins,
    inactiveSiteAdmins,
    fetchAdministration,
    createSite,
    createSiteAdmin,
    updateSiteAdmin,
    resetSiteAdminPassword,
    revokeSiteAdminSessions,
    clearTemporaryPassword,
    clearRevocationNotice,
  }
})
