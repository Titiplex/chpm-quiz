<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { appConfig } from '@/config/env'
import { defaultPathByRole } from '@/config/navigation'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { activeOperationalRoles, roleProfiles, specializedStaffRoles, type UserRole } from '@shared/types/rbac'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const demoAccounts: Array<{
  role: UserRole
  labelKey: string
  email: string
  password: string
  descriptionKey: string
}> = [
  {
    role: 'admin',
    labelKey: 'auth.role.admin.label',
    email: 'admin@chpm.local',
    password: 'Admin123!',
    descriptionKey: 'auth.role.admin.description',
  },
  {
    role: 'site_manager',
    labelKey: 'auth.role.siteManager.label',
    email: 'site.manager@chpm.local',
    password: 'SiteManager123!',
    descriptionKey: 'auth.role.siteManager.description',
  },
  {
    role: 'moderator',
    labelKey: 'auth.role.moderator.label',
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    descriptionKey: 'auth.role.moderator.description',
  },
  {
    role: 'questionnaire_admin',
    labelKey: 'auth.role.questionnaireAdmin.label',
    email: 'questionnaire.admin@chpm.local',
    password: 'Questionnaire123!',
    descriptionKey: 'auth.role.questionnaireAdmin.description',
  },
  {
    role: 'analyst',
    labelKey: 'auth.role.analyst.label',
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    descriptionKey: 'auth.role.analyst.description',
  },
  {
    role: 'dpo',
    labelKey: 'auth.role.dpo.label',
    email: 'dpo@chpm.local',
    password: 'Dpo12345!',
    descriptionKey: 'auth.role.dpo.description',
  },
  {
    role: 'judicial_officer',
    labelKey: 'auth.role.judicial.label',
    email: 'judiciaire@chpm.local',
    password: 'Judiciaire123!',
    descriptionKey: 'auth.role.judicial.description',
  },
  {
    role: 'technical_admin',
    labelKey: 'auth.role.technical.label',
    email: 'tech@chpm.local',
    password: 'Tech12345!',
    descriptionKey: 'auth.role.technical.description',
  },
]

const operationalAccounts = computed(() =>
  activeOperationalRoles
    .map((role) => demoAccounts.find((account) => account.role === role))
    .filter((account): account is (typeof demoAccounts)[number] => Boolean(account)),
)

const specializedAccounts = computed(() =>
  specializedStaffRoles
    .map((role) => demoAccounts.find((account) => account.role === role))
    .filter((account): account is (typeof demoAccounts)[number] => Boolean(account)),
)

const form = reactive({
  email: appConfig.demoMode ? demoAccounts[0]?.email ?? '' : '',
  password: appConfig.demoMode ? demoAccounts[0]?.password ?? '' : '',
})
const isSubmitting = ref(false)

function fillDemoAccount(account: (typeof demoAccounts)[number]): void {
  form.email = account.email
  form.password = account.password
}

async function submit(): Promise<void> {
  isSubmitting.value = true

  try {
    await session.login({ email: form.email, password: form.password })
    const redirect =
      typeof route.query.redirect === 'string'
        ? route.query.redirect
        : defaultPathByRole[session.currentRole]
    await router.replace(redirect)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="demo-page login-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="row g-4 align-items-stretch">
        <div class="col-xl-7">
          <div class="hero-card p-4 p-lg-5 h-100">
            <div class="position-relative z-1">
              <p class="hero-eyebrow mb-3">{{ t('auth.internal') }}</p>
              <h1 class="hero-title fw-black mb-4">
                {{ appConfig.demoMode ? t('auth.demo.title') : t('auth.connected.title') }}
              </h1>
              <p class="hero-text mb-4">
                {{ appConfig.demoMode ? t('auth.demo.body') : t('auth.connected.body') }}
              </p>

              <div v-if="appConfig.demoMode" class="alert alert-warning rounded-4 mb-4" role="alert">
                <strong>{{ t('auth.demo.warning.title') }}</strong>
                <p class="small mb-0 mt-1">{{ t('auth.demo.warning.body') }}</p>
              </div>

              <div v-if="appConfig.demoMode" class="demo-card bg-white border-0 mb-4">
                <p class="section-eyebrow mb-2">{{ t('auth.hierarchy.eyebrow') }}</p>
                <h2 class="h5 fw-bold mb-3">{{ t('auth.hierarchy.title') }}</h2>
                <div class="row g-3">
                  <div v-for="(role, index) in activeOperationalRoles" :key="role" class="col-md-4">
                    <div class="border rounded-4 p-3 h-100">
                      <span class="badge-soft success">{{ t('auth.level', { level: index + 1 }) }}</span>
                      <h3 class="h6 fw-bold mt-2 mb-1">{{ roleProfiles[role].label }}</h3>
                      <p class="small muted mb-0">{{ roleProfiles[role].scopeLabel }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="appConfig.demoMode" class="d-grid gap-3 mb-4">
                <article
                  v-for="account in operationalAccounts"
                  :key="account.email"
                  class="demo-account-card"
                >
                  <div>
                    <span class="badge-soft success">{{ t(account.labelKey) }}</span>
                    <h2 class="h5 fw-bold mt-2 mb-1">{{ account.email }}</h2>
                    <p class="small muted mb-0">{{ t(account.descriptionKey) }}</p>
                  </div>
                  <button
                    class="btn btn-outline-primary"
                    type="button"
                    @click="fillDemoAccount(account)"
                  >
                    {{ t('auth.useAccount') }}
                  </button>
                </article>
              </div>

              <details v-if="appConfig.demoMode" class="demo-card bg-white border-0">
                <summary class="fw-bold">{{ t('auth.specializedRoles') }}</summary>
                <div class="d-grid gap-3 mt-3">
                  <article
                    v-for="account in specializedAccounts"
                    :key="account.email"
                    class="demo-account-card"
                  >
                    <div>
                      <span class="badge-soft">{{ t(account.labelKey) }}</span>
                      <h2 class="h5 fw-bold mt-2 mb-1">{{ account.email }}</h2>
                      <p class="small muted mb-0">{{ t(account.descriptionKey) }}</p>
                    </div>
                    <button
                      class="btn btn-outline-primary"
                      type="button"
                      @click="fillDemoAccount(account)"
                    >
                      {{ t('auth.useAccount') }}
                    </button>
                  </article>
                </div>
              </details>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">{{ t('auth.internalAccount') }}</p>
            <h2 class="h3 fw-bold mb-4">{{ t('auth.signIn') }}</h2>

            <form @submit.prevent="submit">
              <label class="form-label fw-bold" for="email">{{ t('auth.email') }}</label>
              <input
                id="email"
                v-model="form.email"
                class="form-control mb-3"
                autocomplete="username"
                type="email"
              />

              <label class="form-label fw-bold" for="password">{{ t('auth.password') }}</label>
              <input
                id="password"
                v-model="form.password"
                class="form-control mb-3"
                autocomplete="current-password"
                type="password"
              />

              <div v-if="session.error" class="alert alert-danger rounded-4" role="alert">
                {{ session.error }}
              </div>

              <button class="btn btn-primary w-100 btn-lg" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? t('auth.submitting') : t('auth.login') }}
              </button>
            </form>

            <hr class="my-4" />
            <p class="small muted mb-0">
              {{ appConfig.demoMode ? t('auth.demo.note') : t('auth.production.note') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
