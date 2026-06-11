<script setup lang="ts">
interface Props {
  eyebrow: string
  title: string
  description?: string
  badge?: string
}

defineProps<Props>()
</script>

<template>
  <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
    <div>
      <p class="section-eyebrow mb-2">{{ eyebrow }}</p>
      <h1 class="h2 fw-bold mb-1">{{ title }}</h1>
      <p v-if="description" class="muted mb-0 page-header-description">
        {{ description }}
      </p>
    </div>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <span v-if="badge" class="badge-soft">{{ badge }}</span>
      <slot name="actions" />
    </div>
  </div>
</template>
