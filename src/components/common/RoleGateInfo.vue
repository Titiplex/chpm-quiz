<script setup lang="ts">
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
</script>

<template>
  <div class="role-gate-info">
    <span class="badge-soft success">Utilisateur simulé</span>
    <div>
      <strong>{{ session.currentProfile.label }}</strong>
      <p class="small muted mb-0">{{ session.currentProfile.description }}</p>
    </div>
  </div>
</template>
