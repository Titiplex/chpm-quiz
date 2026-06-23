import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiTerminalDevice,
  RegisterTerminalDeviceRequest,
  RegisterTerminalDeviceResponse,
  RegenerateTerminalDeviceTokenResponse,
  TerminalDeviceMutationResponse,
  TerminalDevicesResponse,
  UpdateTerminalDeviceRequest,
} from '@shared/types/api'

type TerminalAdminStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export const useTerminalAdminStore = defineStore('terminalAdmin', () => {
  const terminalDevices = ref<ApiTerminalDevice[]>([])
  const status = ref<TerminalAdminStatus>('idle')
  const error = ref<string | null>(null)
  const lastLaunchLink = ref<string | null>(null)
  const lastMutatedDevice = ref<ApiTerminalDevice | null>(null)

  const totals = computed(() => ({
    total: terminalDevices.value.length,
    active: terminalDevices.value.filter((device) => device.status === 'active').length,
    paused: terminalDevices.value.filter((device) => device.status === 'paused').length,
    revoked: terminalDevices.value.filter((device) => device.status === 'revoked').length,
    pendingInvitations: terminalDevices.value.reduce((sum, device) => sum + device.pendingInvitationCount, 0),
  }))

  async function fetchTerminalDevices(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<TerminalDevicesResponse>('/terminal-devices')
      terminalDevices.value = response.terminalDevices
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement des terminaux impossible.'
    }
  }

  async function createTerminalDevice(payload: RegisterTerminalDeviceRequest): Promise<RegisterTerminalDeviceResponse> {
    status.value = 'saving'
    error.value = null
    lastLaunchLink.value = null
    lastMutatedDevice.value = null

    try {
      const response = await apiRequest<RegisterTerminalDeviceResponse>('/terminal-devices', {
        method: 'POST',
        body: payload,
      })
      terminalDevices.value = [response.terminalDevice, ...terminalDevices.value]
      lastLaunchLink.value = response.terminalLaunchLink
      lastMutatedDevice.value = response.terminalDevice
      status.value = 'ready'
      return response
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Création du terminal impossible.'
      throw caught
    }
  }

  async function updateTerminalDevice(id: string, payload: UpdateTerminalDeviceRequest): Promise<void> {
    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<TerminalDeviceMutationResponse>(`/terminal-devices/${id}`, {
        method: 'PATCH',
        body: payload,
      })
      upsertDevice(response.terminalDevice)
      lastMutatedDevice.value = response.terminalDevice
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Mise à jour du terminal impossible.'
      throw caught
    }
  }

  async function revokeTerminalDevice(id: string): Promise<void> {
    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<TerminalDeviceMutationResponse>(`/terminal-devices/${id}/revoke`, {
        method: 'POST',
      })
      upsertDevice(response.terminalDevice)
      lastMutatedDevice.value = response.terminalDevice
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Révocation du terminal impossible.'
      throw caught
    }
  }

  async function regenerateTerminalToken(id: string): Promise<RegenerateTerminalDeviceTokenResponse> {
    status.value = 'saving'
    error.value = null
    lastLaunchLink.value = null

    try {
      const response = await apiRequest<RegenerateTerminalDeviceTokenResponse>(`/terminal-devices/${id}/regenerate-token`, {
        method: 'POST',
      })
      upsertDevice(response.terminalDevice)
      lastLaunchLink.value = response.terminalLaunchLink
      lastMutatedDevice.value = response.terminalDevice
      status.value = 'ready'
      return response
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Régénération du lien terminal impossible.'
      throw caught
    }
  }

  function upsertDevice(device: ApiTerminalDevice): void {
    const index = terminalDevices.value.findIndex((candidate) => candidate.id === device.id)
    if (index >= 0) {
      terminalDevices.value[index] = device
    } else {
      terminalDevices.value.unshift(device)
    }
  }

  return {
    terminalDevices,
    status,
    error,
    lastLaunchLink,
    lastMutatedDevice,
    totals,
    fetchTerminalDevices,
    createTerminalDevice,
    updateTerminalDevice,
    revokeTerminalDevice,
    regenerateTerminalToken,
  }
})
