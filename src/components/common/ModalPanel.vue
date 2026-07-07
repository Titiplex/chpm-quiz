<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  eyebrow?: string
  description?: string
  size?: 'md' | 'lg' | 'xl'
  titleId?: string
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  description: undefined,
  size: 'lg',
  titleId: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const generatedTitleId = `modal-panel-title-${Math.random().toString(36).slice(2)}`
const labelledBy = computed(() => props.titleId ?? generatedTitleId)

function close(): void {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <div v-if="modelValue" class="modal-panel-backdrop" role="presentation" @click.self="close">
    <section class="modal-panel" :class="`modal-panel-${size}`" role="dialog" aria-modal="true" :aria-labelledby="labelledBy">
      <header class="modal-panel-header">
        <div>
          <p v-if="eyebrow" class="section-eyebrow mb-1">{{ eyebrow }}</p>
          <h2 :id="labelledBy" class="modal-panel-title">{{ title }}</h2>
          <p v-if="description" class="modal-panel-description mb-0">{{ description }}</p>
        </div>
        <button class="modal-panel-close" type="button" aria-label="Fermer la fenêtre" @click="close">×</button>
      </header>
      <div class="modal-panel-body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="modal-panel-footer">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>
