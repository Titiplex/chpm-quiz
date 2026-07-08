import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiSiteTeamUser,
  CreateSiteModeratorRequest,
  RevokeSessionsResponse,
  SiteModeratorMutationResponse,
  SiteTeamResponse,
  UpdateSiteModeratorRequest,
} from '@shared/types/api'

type SiteTeamStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export const useSiteTeamStore = defineStore('siteTeam', () => {
  const users = ref<ApiSiteTeamUser[]>([])
  const status = ref<SiteTeamStatus>('idle')
  const error = ref<string | null>(null)
  const lastTemporaryPassword = ref<string | null>(null)
  const lastTemporaryPasswordUser = ref<ApiSiteTeamUser | null>(null)
  const lastRevokedSessionCount = ref<number | null>(null)

  const activeModerators = computed(() => users.value.filter((user) => user.role === 'moderator' && user.isActive))
  const inactiveModerators = computed(() => users.value.filter((user) => user.role === 'moderator' && !user.isActive))
  const siteManagers = computed(() => users.value.filter((user) => user.role === 'site_manager'))

  async function fetchTeam(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<SiteTeamResponse>('/site/team')
      users.value = response.users
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement de l’équipe impossible.'
    }
  }

  async function createModerator(payload: CreateSiteModeratorRequest): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastTemporaryPassword.value = null
    lastTemporaryPasswordUser.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteModeratorMutationResponse>('/site/moderators', {
        method: 'POST',
        body: payload,
      })
      upsertUser(response.user)
      lastTemporaryPassword.value = response.temporaryPassword ?? null
      lastTemporaryPasswordUser.value = response.user
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création du modérateur impossible.'
      throw caught
    }
  }

  async function updateModerator(id: string, payload: UpdateSiteModeratorRequest): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteModeratorMutationResponse>(`/site/moderators/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      upsertUser(response.user)
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Mise à jour du modérateur impossible.'
      throw caught
    }
  }

  async function resetModeratorPassword(id: string): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastTemporaryPassword.value = null
    lastTemporaryPasswordUser.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<SiteModeratorMutationResponse>(`/site/moderators/${id}/reset-password`, {
        method: 'POST',
      })
      upsertUser(response.user)
      lastTemporaryPassword.value = response.temporaryPassword ?? null
      lastTemporaryPasswordUser.value = response.user
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Réinitialisation du mot de passe impossible.'
      throw caught
    }
  }

  async function revokeModeratorSessions(id: string): Promise<void> {
    status.value = 'saving'
    error.value = null
    lastRevokedSessionCount.value = null

    try {
      const response = await apiRequest<RevokeSessionsResponse>(`/site/moderators/${id}/revoke-sessions`, {
        method: 'POST',
      })
      upsertUser(response.user)
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

  function upsertUser(user: ApiSiteTeamUser): void {
    const index = users.value.findIndex((candidate) => candidate.id === user.id)
    if (index === -1) {
      users.value = [user, ...users.value]
      return
    }

    users.value = users.value.map((candidate) => candidate.id === user.id ? user : candidate)
  }

  return {
    users,
    status,
    error,
    lastTemporaryPassword,
    lastTemporaryPasswordUser,
    lastRevokedSessionCount,
    activeModerators,
    inactiveModerators,
    siteManagers,
    fetchTeam,
    createModerator,
    updateModerator,
    resetModeratorPassword,
    revokeModeratorSessions,
    clearTemporaryPassword,
    clearRevocationNotice,
  }
})
