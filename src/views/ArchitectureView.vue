<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="hero-card p-4 p-lg-5 mb-4">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-2">Architecture visuelle</p>
          <h1 class="h2 fw-bold mb-3">Serveur central, accès mondial, séparation stricte email ↔ réponses</h1>
          <p class="hero-text mb-0">
            Cette page ne décrit pas une implémentation backend complète ; elle rend visibles les
            contraintes à intégrer au cahier des charges technique : centralisation, anonymisation,
            traçabilité, droits par rôle et accès exceptionnel aux emails sur décision judiciaire.
          </p>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-8">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Flux de données</p>
            <h2 class="h4 fw-bold mb-4">Principe d’identification par code unique</h2>
            <div class="row g-3">
              <div class="col-md-6 col-xl-3">
                <div class="architecture-lane h-100">
                  <div class="architecture-pill mb-3">Modérateur</div>
                  <p class="small muted mb-0">Saisit un email, choisit le bâtiment, déclenche l’invitation.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="architecture-lane h-100">
                  <div class="architecture-pill mb-3">Service invitation</div>
                  <p class="small muted mb-0">Génère un code unique, signe le lien et l’envoie par email.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="architecture-lane h-100">
                  <div class="architecture-pill mb-3">Questionnaire</div>
                  <p class="small muted mb-0">Stocke réponses, temps, popups et statut avec le code comme identifiant.</p>
                </div>
              </div>
              <div class="col-md-6 col-xl-3">
                <div class="architecture-lane h-100">
                  <div class="architecture-pill mb-3">Statistiques</div>
                  <p class="small muted mb-0">Agrège par question, questionnaire, bâtiment, langue et groupe.</p>
                </div>
              </div>
            </div>

            <hr class="my-4" />

            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3 rounded-4 border bg-white h-100">
                  <span class="badge-soft success mb-3">Base opérationnelle</span>
                  <h3 class="h5 fw-bold">BDD questionnaires</h3>
                  <ul class="small muted mb-0">
                    <li>code_unique</li>
                    <li>réponses anonymes</li>
                    <li>temps question / questionnaire</li>
                    <li>popups ouvertes</li>
                    <li>bâtiment, groupe, langue, version</li>
                  </ul>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded-4 border bg-white h-100">
                  <span class="badge-soft danger mb-3">Accès juridiquement restreint</span>
                  <h3 class="h5 fw-bold">BDD emails séparée</h3>
                  <ul class="small muted mb-0">
                    <li>code_unique</li>
                    <li>email</li>
                    <li>historique d’envoi</li>
                    <li>accès uniquement sur ordre d’un juge</li>
                    <li>journalisation des accès exceptionnels</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="d-grid gap-4">
            <div class="demo-card">
              <p class="section-eyebrow mb-2">Droits par rôle</p>
              <h2 class="h5 fw-bold">Contrôle d’accès</h2>
              <div class="timeline">
                <div class="timeline-item">
                  <strong>Répondant</strong>
                  <p class="small muted mb-0">Accès par lien, brouillon avant soumission, lecture de ses propres pages uniquement.</p>
                </div>
                <div class="timeline-item">
                  <strong>Modérateur</strong>
                  <p class="small muted mb-0">Envoi et suivi des liens dans son périmètre, sans accès aux réponses nominatives.</p>
                </div>
                <div class="timeline-item pb-0">
                  <strong>Administrateur</strong>
                  <p class="small muted mb-0">Configuration, statistiques et soumissions anonymes selon habilitation.</p>
                </div>
              </div>
            </div>

            <div class="demo-card">
              <p class="section-eyebrow mb-2">Centralisation</p>
              <h2 class="h5 fw-bold">Déploiement mondial</h2>
              <p class="muted mb-3">
                Les sites web locaux pointent vers un service central. Les questionnaires restent
                versionnés au même endroit, ce qui évite la divergence entre pays ou bâtiments.
              </p>
              <div class="map-grid">
                <span v-for="n in 40" :key="n" class="map-node" :class="{ active: n % 5 === 0, warning: n % 17 === 0 }"></span>
              </div>
            </div>

            <div class="demo-card">
              <span class="badge-soft warning mb-3">À cadrer techniquement</span>
              <p class="mb-0">
                Expiration des liens, chiffrement, journaux d’audit, sauvegardes, politique RGPD,
                rétention des données et procédure d’accès judiciaire devront être spécifiés côté backend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
