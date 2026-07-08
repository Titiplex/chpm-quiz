import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiInvitation,
  ApiTerminalDevice,
  CreateInvitationRequest,
  CreateInvitationResponse,
  InvitationsResponse,
  RegisterTerminalDeviceRequest,
  RegisterTerminalDeviceResponse,
  TerminalDevicesResponse,
} from '@shared/types/api'

type ModerationStatus = 'idle' | 'loading' | 'ready' | 'creating' | 'error'

export const useModerationStore = defineStore('moderation', () => {
  const invitations = ref<ApiInvitation[]>([])
  const terminalDevices = ref<ApiTerminalDevice[]>([])
  const status = ref<ModerationStatus>('idle')
  const error = ref<string | null>(null)
  const lastCreatedLink = ref<string | null>(null)
  const lastCreatedTerminalLink = ref<string | null>(null)
  const lastRegisteredTerminalLink = ref<string | null>(null)
  const lastCreatedInvitation = ref<ApiInvitation | null>(null)

  const totals = computed(() => ({
    sent: invitations.value.length,
    submitted: invitations.value.filter((invitation) => invitation.status === 'submitted').length,
    pending: invitations.value.filter((invitation) => ['sent', 'opened', 'in_progress', 'draft'].includes(invitation.status)).length,
    blocked: invitations.value.filter((invitation) => ['blocked', 'expired', 'cancelled'].includes(invitation.status)).length,
    onsiteTerminal: invitations.value.filter((invitation) => invitation.deliveryMode === 'onsite_terminal').length,
    sms: invitations.value.filter((invitation) => invitation.deliveryMode === 'sms' || invitation.deliveryMode === 'sms_simulation').length,
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

  async function fetchTerminalDevices(): Promise<void> {
    try {
      const response = await apiRequest<TerminalDevicesResponse>('/moderation/terminal-devices')
      terminalDevices.value = response.terminalDevices
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Chargement des terminaux impossible.'
    }
  }

  async function refresh(): Promise<void> {
    await Promise.all([fetchInvitations(), fetchTerminalDevices()])
  }

  async function createInvitation(payload: CreateInvitationRequest): Promise<void> {
    status.value = 'creating'
    error.value = null
    lastCreatedLink.value = null
    lastCreatedTerminalLink.value = null
    lastCreatedInvitation.value = null

    try {
      const response = await apiRequest<CreateInvitationResponse>('/moderation/invitations', {
        method: 'POST',
        body: payload,
      })
      invitations.value = [response.invitation, ...invitations.value]
      lastCreatedLink.value = response.devAccessLink
      lastCreatedTerminalLink.value = response.terminalDispatchLink ?? null
      lastCreatedInvitation.value = response.invitation
      await fetchTerminalDevices()
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création d’invitation impossible.'
      throw caught
    }
  }

  async function registerTerminalDevice(payload: RegisterTerminalDeviceRequest): Promise<void> {
    status.value = 'creating'
    error.value = null
    lastRegisteredTerminalLink.value = null

    try {
      const response = await apiRequest<RegisterTerminalDeviceResponse>('/moderation/terminal-devices', {
        method: 'POST',
        body: payload,
      })
      terminalDevices.value = [response.terminalDevice, ...terminalDevices.value]
      lastRegisteredTerminalLink.value = response.terminalLaunchLink
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Enregistrement du terminal impossible.'
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
    await fetchTerminalDevices()
  }

  return {
    invitations,
    terminalDevices,
    status,
    error,
    lastCreatedLink,
    lastCreatedTerminalLink,
    lastRegisteredTerminalLink,
    lastCreatedInvitation,
    totals,
    fetchInvitations,
    fetchTerminalDevices,
    refresh,
    createInvitation,
    registerTerminalDevice,
    resendInvitation,
  }
})
