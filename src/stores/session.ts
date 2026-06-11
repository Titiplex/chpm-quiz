import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { appConfig } from '@/config/env'
import { getVisibleNavigation } from '@/config/navigation'
import { isUserRole, roleProfiles, type UserRole } from '@shared/types/rbac'

const storageKey = 'chpm-demo-role'

function readInitialRole(): UserRole {
  const saved = window.localStorage.getItem(storageKey)

  if (isUserRole(saved)) {
    return saved
  }

  return appConfig.defaultRole
}

export const useSessionStore = defineStore('session', () => {
  const currentRole = ref<UserRole>(readInitialRole())

  const currentProfile = computed(() => roleProfiles[currentRole.value])
  const visibleNavigation = computed(() => getVisibleNavigation(currentRole.value))
  const permissionLabels = computed(() => currentProfile.value.permissions)

  function setRole(role: UserRole): void {
    currentRole.value = role
    window.localStorage.setItem(storageKey, role)
  }

  return {
    currentRole,
    currentProfile,
    visibleNavigation,
    permissionLabels,
    setRole,
  }
})
