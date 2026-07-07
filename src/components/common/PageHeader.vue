<script setup lang="ts">
interface Props {
  eyebrow?: string
  title: string
  description?: string
  badge?: string
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger'
}

withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  description: undefined,
  badge: undefined,
  badgeTone: 'neutral',
})
</script>

<template>
  <div class="page-header d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
    <div>
      <p v-if="eyebrow" class="page-header-eyebrow mb-1">{{ eyebrow }}</p>
      <h1 class="page-header-title mb-0">{{ title }}</h1>
      <p v-if="description" class="page-header-description mt-1 mb-0">
        {{ description }}
      </p>
    </div>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <span v-if="badge" class="badge-soft" :class="badgeTone">{{ badge }}</span>
      <slot name="actions" />
    </div>
  </div>
</template>
