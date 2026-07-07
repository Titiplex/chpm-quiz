<script setup lang="ts">
import { computed } from 'vue'

import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const roleKindLabel = computed(() => session.currentProfile.activeRole ? 'Rôle actif' : 'Rôle spécialisé')
const scopeText = computed(() => {
  if (session.user?.building) {
    return `Périmètre : ${session.user.building.label}.`
  }
  return `Périmètre : ${session.currentProfile.scopeLabel}.`
})
</script>

<template>
  <div v-if="session.user" class="role-gate-info">
    <span class="badge-soft success" style="flex-shrink:0;">{{ roleKindLabel }}</span>
    <div class="d-flex align-items-start gap-2 flex-grow-1 min-width-0">
      <div>
        <strong style="font-size:0.9rem;">{{ session.currentProfile.label }} — {{ session.user.displayName }}</strong>
        <p class="small mb-0" style="color: var(--chm-muted); margin-top:0.1rem;">
          {{ scopeText }}
        </p>
      </div>
    </div>
  </div>
</template>
