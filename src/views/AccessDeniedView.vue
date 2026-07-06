<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { defaultPathByRole } from '@/config/navigation'
import { t } from '@/i18n'
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
          <p class="hero-eyebrow mb-2">{{ t('accessDenied.eyebrow') }}</p>
          <h1 class="h2 fw-bold mb-3">{{ t('accessDenied.title') }}</h1>
          <p class="hero-text mb-4">
            {{ t('accessDenied.body') }}
          </p>
          <RoleGateInfo class="mb-4" />
          <RouterLink class="btn btn-primary btn-lg" :to="fallbackPath">
            {{ t('accessDenied.cta') }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
