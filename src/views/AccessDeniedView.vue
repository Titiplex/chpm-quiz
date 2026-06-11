<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const session = useSessionStore()

const fallbackPath = computed(() => {
  const fallback = route.query.fallback
  return typeof fallback === 'string' ? fallback : defaultPathByRole[session.currentRole]
})
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="hero-card p-4 p-lg-5">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-2">Contrôle d’accès simulé</p>
          <h1 class="h2 fw-bold mb-3">Cette page n’est pas visible pour le rôle courant.</h1>
          <p class="hero-text mb-4">
            Le routage applique déjà une matrice de droits côté front. Changez de rôle dans le bandeau
            supérieur pour tester la navigation conditionnelle, ou revenez à la page pertinente du rôle actif.
          </p>
          <RoleGateInfo class="mb-4" />
          <RouterLink class="btn btn-primary btn-lg" :to="fallbackPath">
            Aller vers l’écran autorisé
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
