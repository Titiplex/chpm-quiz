<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { hasRoleAccess, type UserRole } from '@shared/types/rbac'

const session = useSessionStore()

const moduleDefinitions: Array<{
  titleKey: string
  descriptionKey: string
  to: string
  roles: UserRole[]
  icon: string
}> = [
  {
    titleKey: 'home.modules.projectAdministration.title',
    descriptionKey: 'home.modules.projectAdministration.description',
    to: '/administration-projet',
    roles: ['admin'],
    icon: '🧭',
  },
  {
    titleKey: 'home.modules.questionnaires.title',
    descriptionKey: 'home.modules.questionnaires.description',
    to: '/admin',
    roles: ['admin', 'questionnaire_admin'],
    icon: '⚙️',
  },
  {
    titleKey: 'home.modules.moderation.title',
    descriptionKey: 'home.modules.moderation.description',
    to: '/moderation',
    roles: ['moderator', 'site_manager'],
    icon: '📨',
  },
  {
    titleKey: 'home.modules.statistics.title',
    descriptionKey: 'home.modules.statistics.description',
    to: '/stats',
    roles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst'],
    icon: '📊',
  },
]

const visibleModules = computed(() =>
  moduleDefinitions.filter((module) => hasRoleAccess(session.currentRole, module.roles)),
)

const defaultPath = computed(() => defaultPathByRole[session.currentRole])
const primaryAction = computed(() => {
  if (hasRoleAccess(session.currentRole, ['admin'])) {
    return { label: t('home.actions.projectAdministration'), to: '/administration-projet' }
  }
  if (hasRoleAccess(session.currentRole, ['questionnaire_admin'])) {
    return { label: t('home.actions.questionnaireBuilder'), to: '/admin' }
  }
  if (hasRoleAccess(session.currentRole, ['site_manager', 'moderator'])) {
    return { label: t('home.actions.moderation'), to: '/moderation' }
  }
  if (hasRoleAccess(session.currentRole, ['analyst'])) {
    return { label: t('home.actions.statistics'), to: '/stats' }
  }
  return { label: t('home.actions.workspace'), to: defaultPath.value }
})
const greetingName = computed(() => session.user?.displayName?.split(' ')[0] ?? '')
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="hero-card p-4 p-lg-5 mb-4">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-2">{{ t('home.eyebrow') }}</p>
          <h1 class="hero-title mb-2">
            {{ greetingName ? t('home.greeting', { name: greetingName }) : t('home.title') }}
          </h1>
          <p class="hero-text mb-4">{{ t('home.welcome') }}</p>
          <RouterLink class="btn btn-light fw-bold" :to="primaryAction.to">
            {{ primaryAction.label }}
          </RouterLink>
        </div>
      </div>

      <div v-if="visibleModules.length" class="mb-4">
        <h2
          class="page-header-title mb-3"
          style="font-size: 1.05rem; font-weight: 700; color: var(--chm-navy)"
        >
          {{ t('home.modules.title') }}
        </h2>
        <div class="row g-3">
          <div v-for="module in visibleModules" :key="module.to" class="col-sm-6 col-xl-3">
            <RouterLink :to="module.to" class="module-card text-decoration-none">
              <span class="module-card-icon">{{ module.icon }}</span>
              <div>
                <div class="module-card-title">{{ t(module.titleKey) }}</div>
                <div class="module-card-desc">{{ t(module.descriptionKey) }}</div>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
