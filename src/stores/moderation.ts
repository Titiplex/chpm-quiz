import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiInvitation,
  CreateInvitationRequest,
  CreateInvitationResponse,
  InvitationsResponse,
} from '@shared/types/api'

type ModerationStatus = 'idle' | 'loading' | 'ready' | 'creating' | 'error'

export const useModerationStore = defineStore('moderation', () => {
  const invitations = ref<ApiInvitation[]>([])
  const status = ref<ModerationStatus>('idle')
  const error = ref<string | null>(null)
  const lastCreatedLink = ref<string | null>(null)
  const lastCreatedInvitation = ref<ApiInvitation | null>(null)

  const totals = computed(() => ({
    sent: invitations.value.length,
    submitted: invitations.value.filter((invitation) => invitation.status === 'submitted').length,
    pending: invitations.value.filter((invitation) => ['sent', 'opened', 'in_progress', 'draft'].includes(invitation.status)).length,
    blocked: invitations.value.filter((invitation) => ['blocked', 'expired', 'cancelled'].includes(invitation.status)).length,
  }))

  async function fetchInvitations(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<InvitationsResponse>('/moderation/invitations')
      invitations.value = response.invitations
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement des invitations impossible.'
    }
  }

  async function createInvitation(payload: CreateInvitationRequest): Promise<void> {
    status.value = 'creating'
    error.value = null
    lastCreatedLink.value = null
    lastCreatedInvitation.value = null

    try {
      const response = await apiRequest<CreateInvitationResponse>('/moderation/invitations', {
        method: 'POST',
        body: payload,
      })
      invitations.value = [response.invitation, ...invitations.value]
      lastCreatedLink.value = response.devAccessLink
      lastCreatedInvitation.value = response.invitation
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création d’invitation impossible.'
      throw caught
    }
  }

  async function resendInvitation(id: string): Promise<void> {
    const response = await apiRequest<{ invitation: ApiInvitation }>(`/moderation/invitations/${id}/resend`, {
      method: 'POST',
    })
    invitations.value = invitations.value.map((invitation) =>
      invitation.id === id ? response.invitation : invitation,
    )
  }

  return {
    invitations,
    status,
    error,
    lastCreatedLink,
    lastCreatedInvitation,
    totals,
    fetchInvitations,
    createInvitation,
    resendInvitation,
  }
})
