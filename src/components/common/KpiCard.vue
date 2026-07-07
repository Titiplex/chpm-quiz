<script setup lang="ts">
interface Props {
  label: string
  value: string
  detail?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  icon?: string
}

withDefaults(defineProps<Props>(), {
  detail: undefined,
  tone: 'neutral',
  icon: undefined,
})
</script>

<template>
  <div class="kpi-card h-100" :class="`tone-${tone}`">
    <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
      <span class="kpi-label">{{ label }}</span>
      <span v-if="icon" aria-hidden="true" style="font-size:1.1rem;">{{ icon }}</span>
    </div>
    <strong class="kpi-value">{{ value }}</strong>
    <p v-if="detail" class="small mb-0 mt-1" style="color: var(--chm-muted);">
      {{ detail }}
    </p>
  </div>
</template>
