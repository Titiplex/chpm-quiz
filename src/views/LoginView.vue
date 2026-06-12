<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'
import type { UserRole } from '@shared/types/rbac'

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
    label: 'Administrateur',
    email: 'admin@chpm.local',
    password: 'Admin123!',
    description: 'Accès complet : administration, statistiques, architecture, modération.',
  },
  {
    role: 'moderator',
    label: 'Modérateur',
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    description: 'Accès limité : invitations et suivi sur le bâtiment Montréal A.',
  },
  {
    role: 'respondent',
    label: 'Répondant',
    email: 'repondant@chpm.local',
    password: 'Respondent123!',
    description: 'Accès questionnaire uniquement, utile pour vérifier les gardes.',
  },
]

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
              <p class="hero-eyebrow mb-3">Authentification semaine 2</p>
              <h1 class="hero-title fw-black mb-4">Connexion réelle à l’API centrale.</h1>
              <p class="hero-text mb-4">
                La simulation locale de rôle est remplacée par une session serveur. Le backend
                NestJS vérifie les identifiants, pose un cookie HTTP-only, puis renvoie le profil et
                les permissions.
              </p>

              <div class="d-grid gap-3">
                <article
                  v-for="account in demoAccounts"
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
              Le cookie de session n’est pas lisible par JavaScript. Les pages privées interrogent
              `/auth/me` au chargement, puis le routeur applique les permissions retournées par le
              serveur.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
