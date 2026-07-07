<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { appConfig } from '@/config/env'
import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import { hasRoleAccess, type UserRole } from '@shared/types/rbac'

const session = useSessionStore()

const modules: Array<{
  title: string
  description: string
  to: string
  roles: UserRole[]
  icon: string
}> = [
  {
    title: 'Questionnaire',
    description: 'Accéder au questionnaire en cours.',
    to: '/questionnaire',
    roles: ['admin', 'moderator', 'questionnaire_admin'],
    icon: '📋',
  },
  {
    title: 'Administration',
    description: 'Créer et modifier les questionnaires (groupes, questions, popups).',
    to: '/admin',
    roles: ['admin', 'questionnaire_admin'],
    icon: '⚙️',
  },
  {
    title: 'Modération',
    description: 'Inviter des répondants par email ou terminal hospitalier.',
    to: '/moderation',
    roles: ['admin', 'moderator', 'site_manager'],
    icon: '📨',
  },
  {
    title: 'Statistiques',
    description: 'Consulter les taux de réponse, temps médians et signaux de compréhension.',
    to: '/stats',
    roles: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
    icon: '📊',
  },
  {
    title: 'Coffre email',
    description: 'Accéder au registre sécurisé de correspondance code–email.',
    to: '/coffre-email',
    roles: ['dpo', 'judicial_officer'],
    icon: '🔒',
  },
]

const visibleModules = computed(() =>
  modules.filter((m) => hasRoleAccess(session.currentRole, m.roles)),
)

const defaultPath = computed(() => defaultPathByRole[session.currentRole])
const canOpenAdmin = computed(() => hasRoleAccess(session.currentRole, ['admin', 'questionnaire_admin']))
const canOpenVault = computed(() => hasRoleAccess(session.currentRole, ['dpo', 'judicial_officer']))
const canOpenStats = computed(() => hasRoleAccess(session.currentRole, ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo']))

const greetingName = computed(() => session.user?.displayName?.split(' ')[0] ?? '')
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">

      <!-- En-tête de bienvenue -->
      <div class="hero-card p-4 p-lg-5 mb-4">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-2">
            {{ appConfig.demoMode ? 'Mode démo' : 'Application connectée' }}
          </p>
          <h1 class="hero-title mb-2">
            {{ greetingName ? `Bonjour, ${greetingName}` : 'CHM Quiz' }}
          </h1>
          <p class="hero-text mb-4">
            {{ appConfig.demoMode
              ? 'Version de démonstration sans données réelles. Naviguez librement pour découvrir les modules.'
              : 'Bienvenue sur la plateforme de questionnaires du CH Montfavet.' }}
          </p>
          <div class="d-flex flex-wrap gap-2">
            <RouterLink v-if="canOpenAdmin" class="btn btn-light fw-bold" to="/admin">
              Constructeur de questionnaire
            </RouterLink>
            <RouterLink v-if="canOpenVault" class="btn btn-outline-light" to="/coffre-email">
              Coffre email
            </RouterLink>
            <RouterLink v-if="!canOpenAdmin && canOpenStats" class="btn btn-light fw-bold" to="/stats">
              Mes statistiques
            </RouterLink>
            <RouterLink v-else-if="!canOpenAdmin" class="btn btn-light fw-bold" :to="defaultPath">
              Mon espace
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Contexte de l'utilisateur -->
      <RoleGateInfo class="mb-4" />

      <!-- Modules accessibles -->
      <div v-if="visibleModules.length" class="mb-4">
        <h2 class="page-header-title mb-3" style="font-size:1.05rem; font-weight:700; color: var(--chm-navy);">
          Vos modules
        </h2>
        <div class="row g-3">
          <div
            v-for="mod in visibleModules"
            :key="mod.to"
            class="col-sm-6 col-xl-3"
          >
            <RouterLink :to="mod.to" class="module-card text-decoration-none">
              <span class="module-card-icon">{{ mod.icon }}</span>
              <div>
                <div class="module-card-title">{{ mod.title }}</div>
                <div class="module-card-desc">{{ mod.description }}</div>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
