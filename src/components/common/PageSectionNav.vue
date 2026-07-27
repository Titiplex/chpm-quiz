<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'
interface PageSectionNavItem {
  id: string
  label: string
  hint?: string
}

interface Props {
  title?: string
  sections: PageSectionNavItem[]
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
})

const resolvedTitle = computed(() => props.title ?? t('common.sections'))
</script>

<template>
  <nav class="page-section-nav" :aria-label="resolvedTitle">
    <p class="section-eyebrow mb-2">{{ resolvedTitle }}</p>
    <a v-for="section in sections" :key="section.id" class="page-section-nav-link" :href="`#${section.id}`">
      <span>{{ section.label }}</span>
      <small v-if="section.hint">{{ section.hint }}</small>
    </a>
  </nav>
</template>
