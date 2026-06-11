<script setup lang="ts">
interface Props {
  label: string
  value: string
  detail?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

withDefaults(defineProps<Props>(), {
  detail: undefined,
  tone: 'neutral',
})
</script>

<template>
  <div class="kpi-card h-100">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <p v-if="detail" class="small mb-0" :class="`text-${tone}`">
      {{ detail }}
    </p>
  </div>
</template>
