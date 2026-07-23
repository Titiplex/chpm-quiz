<script setup lang="ts">
import { computed } from 'vue'

import { t } from '@/i18n'
import type { ProjectHierarchyNode as HierarchyNode } from '@shared/types/api'

const props = defineProps<{
  node: HierarchyNode
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)
const hasChildren = computed(() => props.node.children.length > 0)
const shouldStartOpen = computed(
  () => depth.value < 3 || props.node.isCurrentUser || props.node.children.some((child) => child.isCurrentUser),
)
const kindLabel = computed(() => t(`home.hierarchy.kind.${props.node.kind}`))
const icon = computed(() => {
  switch (props.node.kind) {
    case 'project':
      return '◆'
    case 'project_admin':
      return 'A'
    case 'site':
      return 'S'
    case 'site_manager':
      return 'R'
    case 'moderator':
      return 'M'
    default:
      return '•'
  }
})
</script>

<template>
  <details
    v-if="hasChildren"
    class="hierarchy-node"
    :class="[`hierarchy-node-${node.kind}`, { 'hierarchy-node-current': node.isCurrentUser }]"
    :open="shouldStartOpen"
  >
    <summary class="hierarchy-node-summary">
      <span class="hierarchy-node-chevron" aria-hidden="true"></span>
      <span class="hierarchy-node-icon" aria-hidden="true">{{ icon }}</span>
      <span class="hierarchy-node-copy">
        <span class="hierarchy-node-title-row">
          <strong class="hierarchy-node-title">{{ node.label }}</strong>
          <span v-if="node.isCurrentUser" class="badge-soft success">{{ t('home.hierarchy.you') }}</span>
          <span v-if="node.isActive === false" class="badge-soft">{{ t('home.hierarchy.inactive') }}</span>
        </span>
        <span class="hierarchy-node-meta">
          {{ kindLabel }}<template v-if="node.subtitle"> · {{ node.subtitle }}</template>
        </span>
      </span>
      <span class="hierarchy-node-count" :aria-label="t('home.hierarchy.childrenCount', { count: node.children.length })">
        {{ node.children.length }}
      </span>
    </summary>

    <ul class="hierarchy-children" role="group">
      <li v-for="child in node.children" :key="child.id" class="hierarchy-child">
        <ProjectHierarchyNode :node="child" :depth="depth + 1" />
      </li>
    </ul>
  </details>

  <div
    v-else
    class="hierarchy-node hierarchy-node-leaf"
    :class="[`hierarchy-node-${node.kind}`, { 'hierarchy-node-current': node.isCurrentUser }]"
  >
    <span class="hierarchy-node-leaf-spacer" aria-hidden="true"></span>
    <span class="hierarchy-node-icon" aria-hidden="true">{{ icon }}</span>
    <span class="hierarchy-node-copy">
      <span class="hierarchy-node-title-row">
        <strong class="hierarchy-node-title">{{ node.label }}</strong>
        <span v-if="node.isCurrentUser" class="badge-soft success">{{ t('home.hierarchy.you') }}</span>
        <span v-if="node.isActive === false" class="badge-soft">{{ t('home.hierarchy.inactive') }}</span>
      </span>
      <span class="hierarchy-node-meta">
        {{ kindLabel }}<template v-if="node.subtitle"> · {{ node.subtitle }}</template>
      </span>
    </span>
  </div>
</template>
