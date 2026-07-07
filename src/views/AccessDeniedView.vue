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
      <div class="demo-card p-4 p-lg-5">
        <div class="d-flex align-items-start gap-3 mb-4">
          <span aria-hidden="true" style="font-size:2.5rem; line-height:1;">🔒</span>
          <div>
            <p class="page-header-eyebrow mb-1">{{ t('accessDenied.eyebrow') }}</p>
            <h1 class="page-header-title mb-2">{{ t('accessDenied.title') }}</h1>
            <p class="mb-0" style="color: var(--chm-muted); max-width: 560px;">
              {{ t('accessDenied.body') }}
            </p>
          </div>
        </div>
        <RoleGateInfo class="mb-4" />
        <RouterLink class="btn btn-primary" :to="fallbackPath">
          {{ t('accessDenied.cta') }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
