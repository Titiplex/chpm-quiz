<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const roleLabel = computed(() => session.currentProfile.shortLabel)

async function logout(): Promise<void> {
  await session.logout()
  await router.push('/login')
}
</script>

<template>
  <div v-if="session.user" class="user-menu">
    <div class="user-menu-identity">
      <span class="badge-soft success">{{ roleLabel }}</span>
      <div>
        <strong>{{ session.user.displayName }}</strong>
        <small>{{ session.user.email }}</small>
      </div>
    </div>
    <button class="btn btn-sm btn-outline-primary" type="button" @click="logout">
      Déconnexion
    </button>
  </div>
  <RouterLink v-else class="btn btn-primary" to="/login">
    Connexion
  </RouterLink>
</template>
