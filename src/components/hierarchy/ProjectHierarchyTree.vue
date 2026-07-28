<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { t } from '@/i18n'
import { apiRequest } from '@/services/api'
import type { ProjectHierarchyResponse } from '@shared/types/api'
import ProjectHierarchyNode from './ProjectHierarchyNode.vue'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

const status = ref<LoadStatus>('idle')
const response = ref<ProjectHierarchyResponse | null>(null)
const error = ref<string | null>(null)

const scopeDescription = computed(() =>
  response.value ? t(`home.hierarchy.scope.${response.value.scope}`) : '',
)

async function loadHierarchy(): Promise<void> {
  status.value = 'loading'
  error.value = null

  try {
    response.value = await apiRequest<ProjectHierarchyResponse>('/users/hierarchy')
    status.value = 'ready'
  } catch (caught) {
    response.value = null
    status.value = 'error'
    error.value = caught instanceof Error ? caught.message : t('home.hierarchy.error')
  }
}

onMounted(loadHierarchy)
</script>

<template>
  <section class="hierarchy-card" aria-labelledby="project-hierarchy-title">
    <div class="hierarchy-card-header">
      <div>
        <p class="hierarchy-eyebrow mb-1">{{ t('home.hierarchy.eyebrow') }}</p>
        <h2 id="project-hierarchy-title" class="hierarchy-card-title">
          {{ t('home.hierarchy.title') }}
        </h2>
        <p class="hierarchy-card-description mb-0">
          {{ scopeDescription || t('home.hierarchy.description') }}
        </p>
      </div>
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        :disabled="status === 'loading'"
        @click="loadHierarchy"
      >
        {{ status === 'loading' ? t('home.hierarchy.loading') : t('home.hierarchy.refresh') }}
      </button>
    </div>

    <div v-if="status === 'loading' && !response" class="hierarchy-state" role="status">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      {{ t('home.hierarchy.loading') }}
    </div>

    <div v-else-if="status === 'error'" class="alert alert-danger rounded-4 mb-0" role="alert">
      <div>{{ error || t('home.hierarchy.error') }}</div>
      <button class="btn btn-sm btn-outline-danger mt-2" type="button" @click="loadHierarchy">
        {{ t('home.hierarchy.retry') }}
      </button>
    </div>

    <div v-else-if="response" class="hierarchy-tree" role="tree" :aria-label="t('home.hierarchy.title')">
      <ProjectHierarchyNode :node="response.hierarchy" />
    </div>
  </section>
</template>
