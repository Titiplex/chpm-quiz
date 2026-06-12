<script setup lang="ts">
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
</script>

<template>
  <div v-if="session.user" class="role-gate-info">
    <span class="badge-soft success">Session backend</span>
    <div>
      <strong>{{ session.currentProfile.label }} · {{ session.user.displayName }}</strong>
      <p class="small muted mb-0">
        {{ session.currentProfile.description }}
        <span v-if="session.user.building">Périmètre : {{ session.user.building.label }}.</span>
      </p>
    </div>
  </div>
</template>
