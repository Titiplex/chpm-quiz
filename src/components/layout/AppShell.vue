<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

import { appConfig } from '@/config/env'
import { useSessionStore } from '@/stores/session'
import RoleSwitcher from './RoleSwitcher.vue'

const session = useSessionStore()
</script>

<template>
  <div class="app-shell">
    <header class="topbar border-bottom">
      <nav class="navbar navbar-expand-xl bg-white">
        <div class="container-fluid px-4 px-xl-5 gap-3">
          <RouterLink class="navbar-brand brand-mark" to="/">
            <span class="brand-dot">CH</span>
            <span>
              <strong>{{ appConfig.appName }}</strong>
              <small>Prototype front typé</small>
            </span>
          </RouterLink>

          <div class="topbar-actions ms-xl-auto">
            <ul class="navbar-nav gap-2 flex-row flex-wrap justify-content-end">
              <li v-for="item in session.visibleNavigation" :key="item.to" class="nav-item">
                <RouterLink class="nav-link rounded-pill px-3" :to="item.to">
                  {{ item.label }}
                </RouterLink>
              </li>
            </ul>
            <RoleSwitcher />
          </div>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
