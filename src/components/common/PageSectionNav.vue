<script setup lang="ts">
interface PageSectionNavItem {
  id: string
  label: string
  hint?: string
}

interface Props {
  title?: string
  sections: PageSectionNavItem[]
}

withDefaults(defineProps<Props>(), {
  title: 'Sections',
})
</script>

<template>
  <nav class="page-section-nav" :aria-label="title">
    <p class="section-eyebrow mb-2">{{ title }}</p>
    <a v-for="section in sections" :key="section.id" class="page-section-nav-link" :href="`#${section.id}`">
      <span>{{ section.label }}</span>
      <small v-if="section.hint">{{ section.hint }}</small>
    </a>
  </nav>
</template>
