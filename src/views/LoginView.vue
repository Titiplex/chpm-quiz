<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { appConfig } from '@/config/env'
import { defaultPathByRole } from '@/config/navigation'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { apiRequest } from '@/services/api'
import type { UserRole } from '@shared/types/rbac'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const demoAccounts: Array<{ role: UserRole; labelKey: string; email: string; password: string }> =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true'
    ? [
        {
          role: 'admin',
          labelKey: 'auth.role.admin.label',
          email: 'admin@chpm.local',
          password: 'Admin123!',
        },
        {
          role: 'site_manager',
          labelKey: 'auth.role.siteManager.label',
          email: 'site.manager@chpm.local',
          password: 'SiteManager123!',
        },
        {
          role: 'moderator',
          labelKey: 'auth.role.moderator.label',
          email: 'moderateur@chpm.local',
          password: 'Moderator123!',
        },
        {
          role: 'questionnaire_admin',
          labelKey: 'auth.role.questionnaireAdmin.label',
          email: 'questionnaire.admin@chpm.local',
          password: 'Questionnaire123!',
        },
        {
          role: 'analyst',
          labelKey: 'auth.role.analyst.label',
          email: 'analyste@chpm.local',
          password: 'Analyst123!',
        },
        {
          role: 'judicial_officer',
          labelKey: 'auth.role.judicial.label',
          email: 'judiciaire@chpm.local',
          password: 'Judiciaire123!',
        },
        {
          role: 'technical_admin',
          labelKey: 'auth.role.technical.label',
          email: 'tech@chpm.local',
          password: 'Tech12345!',
        },
      ]
    : []

const form = reactive({
  demoAccount: demoAccounts[0]?.email ?? '',
  email: appConfig.demoMode ? (demoAccounts[0]?.email ?? '') : '',
  password: appConfig.demoMode ? (demoAccounts[0]?.password ?? '') : '',
})
const isSubmitting = ref(false)
const authConfig = ref({ localLoginEnabled: true, oidcEnabled: false })

onMounted(async () => {
  try {
    authConfig.value = await apiRequest<{ localLoginEnabled: boolean; oidcEnabled: boolean }>(
      '/auth/config',
    )
  } catch {
    // Keep the local form available so configuration failures remain diagnosable.
  }
})

function startOidc(): void {
  const returnTo = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  window.location.assign(
    `${appConfig.apiBaseUrl}/auth/oidc/start?returnTo=${encodeURIComponent(returnTo)}`,
  )
}

function selectDemoAccount(): void {
  const account = demoAccounts.find((candidate) => candidate.email === form.demoAccount)
  if (!account) return
  form.email = account.email
  form.password = account.password
}

async function submit(): Promise<void> {
  isSubmitting.value = true
  try {
    await session.login({ email: form.email, password: form.password })
    if (session.user?.mustChangePassword) {
      await router.replace('/change-password')
      return
    }
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
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6 col-xl-4">
          <div class="demo-card">
            <p class="section-eyebrow mb-2">{{ t('auth.internal') }}</p>
            <h1 class="page-header-title mb-4">{{ t('auth.login') }}</h1>

            <button
              v-if="authConfig.oidcEnabled"
              class="btn btn-primary w-100 btn-lg mb-4"
              type="button"
              @click="startOidc"
            >
              Sign in with the organization identity provider
            </button>

            <div v-if="appConfig.demoMode && authConfig.localLoginEnabled" class="mb-4">
              <label class="form-label fw-semibold" for="demo-account">{{
                t('auth.demo.account')
              }}</label>
              <select
                id="demo-account"
                v-model="form.demoAccount"
                class="form-select"
                @change="selectDemoAccount"
              >
                <option v-for="account in demoAccounts" :key="account.email" :value="account.email">
                  {{ t(account.labelKey) }}
                </option>
              </select>
            </div>

            <form v-if="authConfig.localLoginEnabled" @submit.prevent="submit">
              <div class="mb-3">
                <label class="form-label fw-semibold" for="email">{{ t('auth.email') }}</label>
                <input
                  id="email"
                  v-model="form.email"
                  class="form-control"
                  autocomplete="username"
                  type="email"
                />
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold" for="password">{{
                  t('auth.password')
                }}</label>
                <input
                  id="password"
                  v-model="form.password"
                  class="form-control"
                  autocomplete="current-password"
                  type="password"
                />
              </div>

              <div v-if="session.error" class="alert alert-danger rounded-3 mb-3" role="alert">
                {{ session.error }}
              </div>

              <button class="btn btn-primary w-100 btn-lg" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? t('auth.submitting') : t('auth.login') }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
