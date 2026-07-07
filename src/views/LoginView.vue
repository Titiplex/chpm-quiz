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

        <!-- Panneau gauche : identité + comptes démo -->
        <div class="col-xl-7">
          <div class="hero-card p-4 p-lg-5 h-100">
            <div class="position-relative z-1">
              <p class="hero-eyebrow mb-2">{{ t('auth.internal') }}</p>
              <h1 class="hero-title mb-3">
                {{ appConfig.demoMode ? t('auth.demo.title') : t('auth.connected.title') }}
              </h1>
              <p class="hero-text mb-4">
                {{ appConfig.demoMode ? t('auth.demo.body') : t('auth.connected.body') }}
              </p>

              <!-- Avertissement démo -->
              <div v-if="appConfig.demoMode" class="mb-4 p-3 rounded-3" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);">
                <strong style="color:#fff;">{{ t('auth.demo.warning.title') }}</strong>
                <p class="small mb-0 mt-1" style="color: rgba(255,255,255,0.75);">{{ t('auth.demo.warning.body') }}</p>
              </div>

              <!-- Comptes opérationnels -->
              <div v-if="appConfig.demoMode" class="d-grid gap-2 mb-4">
                <p class="small mb-2" style="color: rgba(255,255,255,0.6); font-weight:600; text-transform:uppercase; letter-spacing:0.08em; font-size:0.7rem;">
                  Comptes opérationnels
                </p>
                <article
                  v-for="account in operationalAccounts"
                  :key="account.email"
                  class="demo-account-card"
                >
                  <div>
                    <span class="badge-soft success">{{ t(account.labelKey) }}</span>
                    <p class="small mb-0 mt-1" style="color: var(--chm-muted);">{{ t(account.descriptionKey) }}</p>
                  </div>
                  <button
                    class="btn btn-sm btn-outline-primary"
                    style="flex-shrink:0;"
                    type="button"
                    @click="fillDemoAccount(account)"
                  >
                    Utiliser
                  </button>
                </article>
              </div>

              <!-- Comptes spécialisés (repliés) -->
              <details v-if="appConfig.demoMode" style="color: rgba(255,255,255,0.8);">
                <summary style="cursor:pointer; font-weight:600; font-size:0.88rem; color: rgba(255,255,255,0.6);">
                  {{ t('auth.specializedRoles') }}
                </summary>
                <div class="d-grid gap-2 mt-3">
                  <article
                    v-for="account in specializedAccounts"
                    :key="account.email"
                    class="demo-account-card"
                  >
                    <div>
                      <span class="badge-soft">{{ t(account.labelKey) }}</span>
                      <p class="small mb-0 mt-1" style="color: var(--chm-muted);">{{ t(account.descriptionKey) }}</p>
                    </div>
                    <button
                      class="btn btn-sm btn-outline-primary"
                      style="flex-shrink:0;"
                      type="button"
                      @click="fillDemoAccount(account)"
                    >
                      Utiliser
                    </button>
                  </article>
                </div>
              </details>
            </div>
          </div>
        </div>

        <!-- Panneau droit : formulaire de connexion -->
        <div class="col-xl-5">
          <div class="demo-card h-100">
            <h2 class="page-header-title mb-1" style="font-size:1.5rem;">{{ t('auth.signIn') }}</h2>
            <p class="small mb-4" style="color: var(--chm-muted);">{{ t('auth.internalAccount') }}</p>

            <form @submit.prevent="submit">
              <div class="mb-3">
                <label class="form-label fw-semibold" for="email">{{ t('auth.email') }}</label>
                <input
                  id="email"
                  v-model="form.email"
                  class="form-control"
                  autocomplete="username"
                  type="email"
                  placeholder="prenom.nom@chpm.local"
                />
              </div>

              <div class="mb-4">
                <label class="form-label fw-semibold" for="password">{{ t('auth.password') }}</label>
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

            <hr class="my-4" />
            <p class="small mb-0" style="color: var(--chm-muted);">
              {{ appConfig.demoMode ? t('auth.demo.note') : t('auth.production.note') }}
            </p>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>
