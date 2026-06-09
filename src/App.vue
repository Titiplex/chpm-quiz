<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { label: 'Vue d’ensemble', to: '/' },
  { label: 'Admin', to: '/admin' },
  { label: 'Modération', to: '/moderation' },
  { label: 'Questionnaire', to: '/questionnaire' },
  { label: 'Statistiques', to: '/stats' },
]
</script>

<template>
  <div class="app-shell">
    <header class="topbar border-bottom">
      <nav class="navbar navbar-expand-lg bg-white">
        <div class="container-fluid px-4 px-xl-5">
          <RouterLink class="navbar-brand brand-mark" to="/">
            <span class="brand-dot">CH</span>
            <span>
              <strong>CHPM Survey</strong>
              <small>Prototype front</small>
            </span>
          </RouterLink>
          <ul class="navbar-nav ms-auto gap-2 flex-row flex-wrap justify-content-end">
            <li v-for="item in navItems" :key="item.to" class="nav-item">
              <RouterLink class="nav-link rounded-pill px-3" :to="item.to">
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
