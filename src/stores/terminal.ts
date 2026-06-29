import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { ApiInvitation, ApiTerminalDevice, OpenTerminalInvitationResponse, TerminalSessionResponse } from '@shared/types/api'

export const TERMINAL_TOKEN_STORAGE_KEY = 'chpm_terminal_access_token'

type TerminalStatus = 'idle' | 'loading' | 'ready' | 'opening' | 'error'

export const useTerminalStore = defineStore('terminal', () => {
  const terminalToken = ref<string | null>(null)
  const terminalDevice = ref<ApiTerminalDevice | null>(null)
  const invitations = ref<ApiInvitation[]>([])
  const status = ref<TerminalStatus>('idle')
  const error = ref<string | null>(null)

  const hasPendingInvitations = computed(() => invitations.value.length > 0)

  async function load(rawToken?: string | null): Promise<void> {
    const resolvedToken = rawToken || window.localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY)

    if (!resolvedToken) {
      status.value = 'error'
      error.value = 'Aucun jeton terminal fourni.'
      return
    }

    terminalToken.value = resolvedToken
    window.localStorage.setItem(TERMINAL_TOKEN_STORAGE_KEY, resolvedToken)
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<TerminalSessionResponse>(`/terminal/session?token=${encodeURIComponent(resolvedToken)}`)
      terminalDevice.value = response.terminalDevice
      invitations.value = response.invitations
      status.value = 'ready'
    } catch (caught) {
      terminalDevice.value = null
      invitations.value = []
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Terminal hospitalier invalide ou désactivé.'
    }
  }

  async function openInvitation(invitationId: string): Promise<OpenTerminalInvitationResponse> {
    if (!terminalToken.value) throw new Error('Jeton terminal manquant.')
    status.value = 'opening'
    error.value = null

    try {
      const response = await apiRequest<OpenTerminalInvitationResponse>(`/terminal/invitations/${invitationId}/open`, {
        method: 'POST',
        body: { terminalToken: terminalToken.value },
      })
      invitations.value = invitations.value.filter((invitation) => invitation.id !== invitationId)
      status.value = 'ready'
      return response
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Ouverture du questionnaire impossible.'
      throw caught
    }
  }

  function clear(): void {
    window.localStorage.removeItem(TERMINAL_TOKEN_STORAGE_KEY)
    terminalToken.value = null
    terminalDevice.value = null
    invitations.value = []
    status.value = 'idle'
    error.value = null
  }

  return {
    terminalToken,
    terminalDevice,
    invitations,
    status,
    error,
    hasPendingInvitations,
    load,
    openInvitation,
    clear,
  }
})
