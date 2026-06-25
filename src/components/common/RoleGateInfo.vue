<script setup lang="ts">
import { computed } from 'vue'

import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const roleKindLabel = computed(() => session.currentProfile.activeRole ? 'Rôle actif' : 'Rôle spécialisé')
const concreteScope = computed(() => {
  if (session.user?.building) {
    return `Périmètre : ${session.user.building.label}.`
  }

  return `Périmètre : ${session.currentProfile.scopeLabel}.`
})
</script>

<template>
  <div v-if="session.user" class="role-gate-info">
    <span class="badge-soft success">{{ roleKindLabel }}</span>
    <div>
      <strong>{{ session.currentProfile.label }} · {{ session.user.displayName }}</strong>
      <p class="small muted mb-0">
        {{ session.currentProfile.description }}
        <span>{{ concreteScope }}</span>
      </p>
    </div>
  </div>
</template>
