<script setup lang="ts">
interface Props {
  eyebrow?: string
  title: string
  badge?: string
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger'
  defaultOpen?: boolean
  bodyClass?: string
}

withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  badge: undefined,
  badgeTone: 'neutral',
  defaultOpen: true,
  bodyClass: '',
})
</script>

<template>
  <details class="collapsible-section demo-card" :open="defaultOpen">
    <summary class="collapsible-section-summary">
      <span class="collapsible-section-title-block">
        <span v-if="eyebrow" class="section-eyebrow mb-1">{{ eyebrow }}</span>
        <span class="collapsible-section-title">{{ title }}</span>
      </span>
      <span class="collapsible-section-actions">
        <span v-if="badge" class="badge-soft" :class="badgeTone">{{ badge }}</span>
        <span class="collapsible-section-toggle" aria-hidden="true"></span>
      </span>
    </summary>
    <div class="collapsible-section-body" :class="bodyClass">
      <slot />
    </div>
  </details>
</template>
