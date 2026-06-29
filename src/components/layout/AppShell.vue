<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { appConfig } from '@/config/env'
import { useSessionStore } from '@/stores/session'
import UserMenu from './UserMenu.vue'

const session = useSessionStore()
const staticPagesNavigation = [
  { label: 'Vue modérateur', to: '/moderation' },
  { label: 'Questionnaire patient', to: '/questionnaire' },
]
</script>

<template>
  <div class="app-shell">
    <header class="topbar border-bottom">
      <nav class="navbar navbar-expand-xl bg-white">
        <div class="container-fluid px-4 px-xl-5 gap-3">
          <RouterLink
            class="navbar-brand brand-mark"
            :to="appConfig.staticPagesDemo ? '/moderation' : '/'"
          >
            <span class="brand-dot">CH</span>
            <span>
              <strong>{{ appConfig.appName }}</strong>
              <small>{{ appConfig.staticPagesDemo ? 'Démo statique' : 'Produit connecté' }}</small>
            </span>
          </RouterLink>

          <div class="topbar-actions ms-xl-auto">
            <ul
              v-if="appConfig.staticPagesDemo"
              class="navbar-nav gap-2 flex-row flex-wrap justify-content-end"
            >
              <li v-for="item in staticPagesNavigation" :key="item.to" class="nav-item">
                <RouterLink class="nav-link rounded-pill px-3" :to="item.to">
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
            <ul
              v-else-if="session.isAuthenticated"
              class="navbar-nav gap-2 flex-row flex-wrap justify-content-end"
            >
              <li v-for="item in session.visibleNavigation" :key="item.to" class="nav-item">
                <RouterLink class="nav-link rounded-pill px-3" :to="item.to">
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
            <span v-if="appConfig.staticPagesDemo" class="badge-soft success">GitHub Pages</span>
            <UserMenu v-else />
          </div>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
