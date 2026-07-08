<script setup lang="ts">
import { computed } from 'vue'

import { i18nState, switchLocale, t } from '@/i18n'

const availableLocales = i18nState.availableLocales

const locale = computed({
  get: () => i18nState.activeLocale.value,
  set: (value: string) => {
    void switchLocale(value)
  },
})
</script>

<template>
  <div class="language-switcher">
    <label class="visually-hidden" for="interface-language">
      {{ t('i18n.language') }}
    </label>
    <span class="language-switcher-label" aria-hidden="true">
      {{ t('i18n.language.short') }}
    </span>
    <select
      id="interface-language"
      v-model="locale"
      class="form-select form-select-sm"
      :aria-label="t('i18n.language')"
    >
      <option
        v-for="entry in availableLocales"
        :key="entry.code"
        :value="entry.code"
      >
        {{ entry.nativeLabel || entry.label || entry.code.toUpperCase() }}
      </option>
    </select>
  </div>
</template>
