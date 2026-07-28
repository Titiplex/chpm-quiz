<script setup lang="ts">
import { computed } from 'vue'

import { roleText, t } from '@/i18n'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const roleKindLabel = computed(() =>
  t(session.currentProfile.activeRole ? 'role.kind.active' : 'role.kind.specialized'),
)
const scopeText = computed(() => {
  if (session.user?.building) {
    return t('role.scope', { scope: session.user.building.label })
  }
  return t('role.scope', { scope: roleText(session.currentRole, 'scope') })
})
</script>

<template>
  <div v-if="session.user" class="role-gate-info">
    <span class="badge-soft success" style="flex-shrink:0;">{{ roleKindLabel }}</span>
    <div class="d-flex align-items-start gap-2 flex-grow-1 min-width-0">
      <div>
        <strong style="font-size:0.9rem;">{{ roleText(session.currentRole) }} — {{ session.user.displayName }}</strong>
        <p class="small mb-0" style="color: var(--chm-muted); margin-top:0.1rem;">
          {{ scopeText }}
        </p>
      </div>
    </div>
  </div>
</template>
