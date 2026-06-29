import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { getVisibleNavigation } from '@/config/navigation'
import { apiRequest, ApiError } from '@/services/api'
import { roleProfiles, type Permission, type UserRole } from '@shared/types/rbac'
import type { AuthResponse, AuthUserProfile, LoginRequest } from '@shared/types/api'

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export const useSessionStore = defineStore('session', () => {
  const user = ref<AuthUserProfile | null>(null)
  const status = ref<SessionStatus>('idle')
  const error = ref<string | null>(null)
  const isBootstrapped = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))
  const currentRole = computed<UserRole>(() => user.value?.role ?? 'respondent')
  const currentProfile = computed(() => roleProfiles[currentRole.value])
  const visibleNavigation = computed(() =>
    user.value ? getVisibleNavigation(user.value.role) : [],
  )
  const permissionLabels = computed<Permission[]>(() => user.value?.permissions ?? [])

  async function restore(): Promise<void> {
    if (isBootstrapped.value) {
      return
    }

    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<AuthResponse>('/me')
      user.value = response.user
      status.value = 'authenticated'
    } catch (caught) {
      user.value = null
      status.value = 'anonymous'

      if (caught instanceof ApiError && caught.status !== 401) {
        error.value = caught.message
      }
    } finally {
      isBootstrapped.value = true
    }
  }

  async function login(credentials: LoginRequest): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
      })

      user.value = response.user
      status.value = 'authenticated'
      isBootstrapped.value = true
    } catch (caught) {
      user.value = null
      status.value = 'anonymous'
      error.value = caught instanceof Error ? caught.message : 'Connexion impossible.'
      throw caught
    }
  }

  async function logout(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status !== 401) {
        error.value = caught.message
      }
    } finally {
      user.value = null
      status.value = 'anonymous'
      isBootstrapped.value = true
    }
  }

  function hasPermission(permission: Permission): boolean {
    return permissionLabels.value.includes(permission)
  }

  return {
    user,
    status,
    error,
    isBootstrapped,
    isAuthenticated,
    currentRole,
    currentProfile,
    visibleNavigation,
    permissionLabels,
    restore,
    login,
    logout,
    hasPermission,
  }
})
