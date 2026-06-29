<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { appConfig } from '@/config/env'
import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import { activeOperationalRoles, roleProfiles, specializedStaffRoles, type UserRole } from '@shared/types/rbac'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const demoAccounts: Array<{
  role: UserRole
  label: string
  email: string
  password: string
  description: string
}> = [
  {
    role: 'admin',
    label: 'Administrateur global',
    email: 'admin@chpm.local',
    password: 'Admin123!',
    description: 'Niveau 1 : accès global projet, sites, bâtiments, questionnaires, statistiques et terminaux.',
  },
  {
    role: 'site_manager',
    label: 'Gestionnaire de site',
    email: 'site.manager@chpm.local',
    password: 'SiteManager123!',
    description: 'Niveau 2 : gère son site, ses bâtiments, ses invitations, ses terminaux et ses indicateurs agrégés.',
  },
  {
    role: 'moderator',
    label: 'Modérateur bâtiment',
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    description: 'Niveau 3 : invitations et suivi opérationnel uniquement sur le bâtiment Montréal A.',
  },
  {
    role: 'questionnaire_admin',
    label: 'Administrateur questionnaire',
    email: 'questionnaire.admin@chpm.local',
    password: 'Questionnaire123!',
    description: 'Rôle spécialisé : création, versionnement et publication des questionnaires, sans table email.',
  },
  {
    role: 'analyst',
    label: 'Analyste',
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    description: 'Rôle spécialisé : statistiques pseudonymisées, seuils anti-réidentification, sans table email.',
  },
  {
    role: 'dpo',
    label: 'DPO',
    email: 'dpo@chpm.local',
    password: 'Dpo12345!',
    description: 'Rôle spécialisé : conformité, audit, registre RGPD et validation DPO du workflow judiciaire.',
  },
  {
    role: 'judicial_officer',
    label: 'Responsable accès judiciaire',
    email: 'judiciaire@chpm.local',
    password: 'Judiciaire123!',
    description: 'Rôle spécialisé : validation juridique et exécution contrôlée du coffre email.',
  },
  {
    role: 'technical_admin',
    label: 'Administrateur technique',
    email: 'tech@chpm.local',
    password: 'Tech12345!',
    description: 'Rôle spécialisé : maintenance, audit technique, terminaux globaux et registre technique.',
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
  email: demoAccounts[0]?.email ?? '',
  password: demoAccounts[0]?.password ?? '',
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
              <p class="hero-eyebrow mb-3">Authentification interne</p>
              <h1 class="hero-title fw-black mb-4">
                {{ appConfig.demoMode ? 'Connexion simulée pour GitHub Pages.' : 'Connexion réelle à l’API centrale.' }}
              </h1>
              <p class="hero-text mb-4">
                {{ appConfig.demoMode
                  ? 'Cette démo publique fonctionne sans backend : comptes, questionnaires, invitations et réponses sont simulés dans le navigateur.'
                  : 'Les comptes internes utilisent une session serveur HTTP-only. Les répondants, eux, accèdent au questionnaire par lien signé généré dans la modération.' }}
              </p>

              <div class="demo-card bg-white border-0 mb-4">
                <p class="section-eyebrow mb-2">Hiérarchie des rôles actifs</p>
                <h2 class="h5 fw-bold mb-3">Global → site → bâtiment</h2>
                <div class="row g-3">
                  <div v-for="(role, index) in activeOperationalRoles" :key="role" class="col-md-4">
                    <div class="border rounded-4 p-3 h-100">
                      <span class="badge-soft success">Niveau {{ index + 1 }}</span>
                      <h3 class="h6 fw-bold mt-2 mb-1">{{ roleProfiles[role].label }}</h3>
                      <p class="small muted mb-0">{{ roleProfiles[role].scopeLabel }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="d-grid gap-3 mb-4">
                <article
                  v-for="account in operationalAccounts"
                  :key="account.email"
                  class="demo-account-card"
                >
                  <div>
                    <span class="badge-soft success">{{ account.label }}</span>
                    <h2 class="h5 fw-bold mt-2 mb-1">{{ account.email }}</h2>
                    <p class="small muted mb-0">{{ account.description }}</p>
                  </div>
                  <button
                    class="btn btn-outline-primary"
                    type="button"
                    @click="fillDemoAccount(account)"
                  >
                    Utiliser
                  </button>
                </article>
              </div>

              <details class="demo-card bg-white border-0">
                <summary class="fw-bold">Afficher les rôles spécialisés de contrôle</summary>
                <div class="d-grid gap-3 mt-3">
                  <article
                    v-for="account in specializedAccounts"
                    :key="account.email"
                    class="demo-account-card"
                  >
                    <div>
                      <span class="badge-soft">{{ account.label }}</span>
                      <h2 class="h5 fw-bold mt-2 mb-1">{{ account.email }}</h2>
                      <p class="small muted mb-0">{{ account.description }}</p>
                    </div>
                    <button
                      class="btn btn-outline-primary"
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

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Compte interne</p>
            <h2 class="h3 fw-bold mb-4">Se connecter</h2>

            <form @submit.prevent="submit">
              <label class="form-label fw-bold" for="email">Email</label>
              <input
                id="email"
                v-model="form.email"
                class="form-control mb-3"
                autocomplete="username"
                type="email"
              />

              <label class="form-label fw-bold" for="password">Mot de passe</label>
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
                {{ isSubmitting ? 'Connexion…' : 'Connexion' }}
              </button>
            </form>

            <hr class="my-4" />
            <p class="small muted mb-0">
              {{ appConfig.demoMode
                ? 'Mode GitHub Pages : aucune donnée réelle n’est envoyée à un serveur. Les actions sont conservées localement dans le navigateur pour la démonstration.'
                : 'Le cookie de session n’est pas lisible par JavaScript. Les pages privées interrogent `/me` au chargement, puis le routeur applique les permissions retournées par le serveur.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
