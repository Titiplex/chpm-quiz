<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import { hasRoleAccess, roleProfiles, userRoles, type UserRole } from '@shared/types/rbac'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

async function switchRole(role: UserRole): Promise<void> {
  session.setRole(role)

  const allowedRoles = route.meta.allowedRoles

  if (Array.isArray(allowedRoles) && !hasRoleAccess(role, allowedRoles)) {
    await router.push(defaultPathByRole[role])
  }
}
</script>

<template>
  <div class="role-switcher" aria-label="Simulation du rôle connecté">
    <span class="role-switcher-label">Rôle démo</span>
    <button
      v-for="role in userRoles"
      :key="role"
      class="btn btn-sm"
      :class="session.currentRole === role ? 'btn-primary' : 'btn-outline-primary'"
      type="button"
      @click="switchRole(role)"
    >
      {{ roleProfiles[role].shortLabel }}
    </button>
  </div>
</template>
