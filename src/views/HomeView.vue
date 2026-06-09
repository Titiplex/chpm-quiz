<script setup lang="ts">
import { RouterLink } from 'vue-router'

const scopeItems = [
  {
    title: 'Questionnaire adaptatif',
    text: 'Pages configurables, embranchements conditionnels, groupes de questions et mélange aléatoire optionnel.',
    to: '/questionnaire',
  },
  {
    title: 'Administration no-code',
    text: 'Création visuelle des questions, choix du type de réponse, édition des popups explicatifs et règles de parcours.',
    to: '/admin',
  },
  {
    title: 'Modération mondiale',
    text: 'Sélection des répondants par bâtiment, envoi par mail de liens à code unique et suivi des invitations.',
    to: '/moderation',
  },
  {
    title: 'Pilotage statistique',
    text: 'Temps de réponse, popups ouvertes, difficultés de compréhension, statistiques par site et soumissions anonymes.',
    to: '/stats',
  },
]

const principles = [
  'Serveur central accessible depuis un site web mondial',
  'Code unique comme identifiant applicatif principal',
  'Base emails séparée et accès juridiquement verrouillé',
  'Reprise autorisée avant soumission, soumission unique ensuite',
]
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="hero-card p-4 p-lg-5 mb-4">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-3">Cahier des charges illustré</p>
          <h1 class="hero-title fw-black mb-4">
            Plateforme de questionnaires adaptatifs, anonymisés et pilotables à grande échelle.
          </h1>
          <p class="hero-text mb-4">
            Cette démo front met en scène les écrans clés du futur outil : administration visuelle,
            passage du questionnaire, modération des invitations, séparation des données sensibles et
            statistiques de compréhension.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <RouterLink class="btn btn-primary btn-lg" to="/admin">Explorer la maquette admin</RouterLink>
            <RouterLink class="btn btn-outline-primary btn-lg" to="/architecture">
              Voir l’architecture de données
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div v-for="item in scopeItems" :key="item.title" class="col-md-6 col-xl-3">
          <RouterLink :to="item.to" class="text-decoration-none text-reset h-100 d-block">
            <article class="demo-card h-100">
              <span class="badge-soft mb-3">Module</span>
              <h2 class="h5 fw-bold">{{ item.title }}</h2>
              <p class="muted mb-0">{{ item.text }}</p>
            </article>
          </RouterLink>
        </div>
      </div>

      <div class="row g-4 align-items-stretch">
        <div class="col-lg-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Parcours cible</p>
                <h2 class="h3 fw-bold mb-0">De la création à l’analyse</h2>
              </div>
              <span class="badge-soft success align-self-start">Prototype non connecté</span>
            </div>
            <div class="row g-3">
              <div class="col-md-6 col-xl-3">
                <div class="flow-step h-100">
                  <span class="step-number">1</span>
                  <h3 class="h6 fw-bold">Configurer</h3>
                  <p class="small muted mb-0">L’admin crée les groupes, questions, popups et règles adaptatives.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="flow-step h-100">
                  <span class="step-number">2</span>
                  <h3 class="h6 fw-bold">Inviter</h3>
                  <p class="small muted mb-0">Le modérateur saisit un email et déclenche un lien à usage unique.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="flow-step h-100">
                  <span class="step-number">3</span>
                  <h3 class="h6 fw-bold">Répondre</h3>
                  <p class="small muted mb-0">Le répondant avance page par page, peut reprendre avant soumission.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="flow-step h-100">
                  <span class="step-number">4</span>
                  <h3 class="h6 fw-bold">Analyser</h3>
                  <p class="small muted mb-0">Les admins consultent stats, temps, popups et soumissions anonymes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Contraintes structurantes</p>
            <h2 class="h3 fw-bold mb-4">Sécurité et scalabilité visibles dès la maquette</h2>
            <div class="d-grid gap-3">
              <div v-for="principle in principles" :key="principle" class="d-flex gap-3 align-items-start">
                <span class="badge-soft success">✓</span>
                <p class="mb-0 fw-semibold">{{ principle }}</p>
              </div>
            </div>
            <hr class="my-4" />
            <RouterLink class="btn btn-outline-primary w-100" to="/stats">
              Ouvrir le panel de statistiques
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
