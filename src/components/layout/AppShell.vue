<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import { appConfig } from '@/config/env'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import LanguageSwitcher from './LanguageSwitcher.vue'
import UserMenu from './UserMenu.vue'

const session = useSessionStore()
const staticPagesNavigation = computed(() => [
  { label: t('nav.static.moderator'), to: '/moderation' },
  { label: t('nav.static.questionnaire'), to: '/questionnaire' },
])
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <nav class="navbar navbar-expand-xl">
        <div class="container-fluid px-4 px-xl-5 gap-3">
          <RouterLink
            class="navbar-brand brand-mark"
            :to="appConfig.staticPagesDemo ? '/moderation' : '/'"
          >
            <span class="brand-dot">CH</span>
            <span>
              <strong style="font-size:0.95rem; letter-spacing:-0.01em;">{{ appConfig.appName }}</strong>
              <small>{{ appConfig.staticPagesDemo ? t('app.mode.static') : t('app.mode.connected') }}</small>
            </span>
          </RouterLink>

          <div class="topbar-actions ms-xl-auto">
            <ul
              v-if="appConfig.staticPagesDemo"
              class="navbar-nav gap-1 flex-row flex-wrap justify-content-end"
            >
              <li v-for="item in staticPagesNavigation" :key="item.to" class="nav-item">
                <RouterLink class="nav-link" :to="item.to">
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
            <ul
              v-else-if="session.isAuthenticated"
              class="navbar-nav gap-1 flex-row flex-wrap justify-content-end"
            >
              <li v-for="item in session.visibleNavigation" :key="item.to" class="nav-item">
                <RouterLink class="nav-link" :to="item.to">
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
            <span v-if="appConfig.staticPagesDemo" class="badge-soft success">{{ t('app.githubPages') }}</span>
            <LanguageSwitcher />
            <UserMenu v-if="!appConfig.staticPagesDemo" />
          </div>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
