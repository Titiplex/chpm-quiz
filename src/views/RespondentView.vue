<script setup lang="ts">
const telemetry = [
  { label: 'Temps sur la question Q-014', value: '01:42', progress: 68 },
  { label: 'Popup “coordination inter-site” ouverte', value: '2 fois', progress: 42 },
  { label: 'Progression questionnaire', value: '63 %', progress: 63 },
]
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="row g-4 align-items-stretch">
        <div class="col-xl-8">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Vue répondant</p>
                <h1 class="h2 fw-bold mb-1">Questionnaire adaptatif avec aide contextuelle</h1>
                <p class="muted mb-0">
                  Le répondant reçoit uniquement les questions pertinentes, peut consulter les popups
                  d’explication et reprendre tant que la soumission finale n’a pas eu lieu.
                </p>
              </div>
              <span class="badge-soft success align-self-start">Code actif : 8F4K-29QX</span>
            </div>

            <div class="screen-preview">
              <div class="screen-topbar">
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <strong class="ms-2 small muted">Page 4 / 7 · 3 questions par page</strong>
              </div>
              <div class="p-3 p-lg-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="badge-soft">Groupe : Compréhension clinique</span>
                  <span class="small fw-bold text-success">Brouillon sauvegardé il y a 12 s</span>
                </div>

                <div class="question-row mb-3">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <span class="badge-soft">Q-014 · Likert 7 points</span>
                    <button class="btn btn-sm btn-outline-primary">? Explication</button>
                  </div>
                  <h2 class="h5 fw-bold">
                    Le terme “coordination inter-site” est-il clair pour vous ?
                  </h2>
                  <p class="muted">
                    1 = pas du tout clair · 7 = parfaitement clair
                  </p>
                  <div class="likert-scale mb-3" role="group" aria-label="Échelle Likert 7 points">
                    <span v-for="n in 7" :key="n" class="likert-dot" :class="{ active: n === 5 }">
                      {{ n }}
                    </span>
                  </div>
                  <div class="question-help">
                    <div class="d-flex justify-content-between gap-3">
                      <strong>Popup ouvert : coordination inter-site</strong>
                      <span class="badge-soft warning">trace enregistrée</span>
                    </div>
                    <p class="small muted mb-0 mt-2">
                      Définition affichée à l’utilisateur. Le système conserve l’ouverture du popup,
                      l’horodatage et la durée avant réponse pour détecter les formulations ambiguës.
                    </p>
                  </div>
                </div>

                <div class="question-row mb-3">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <span class="badge-soft">Q-015 · Réponse libre</span>
                    <button class="btn btn-sm btn-outline-primary">? Explication</button>
                  </div>
                  <h2 class="h5 fw-bold">Qu’est-ce qui rendrait cette formulation plus facile à comprendre ?</h2>
                  <textarea class="form-control" rows="4" placeholder="Saisissez votre réponse…">Ajouter un exemple concret lié au bâtiment où la personne travaille.</textarea>
                </div>

                <div class="d-flex flex-wrap justify-content-between gap-2">
                  <button class="btn btn-outline-primary">Revenir</button>
                  <div class="d-flex gap-2">
                    <button class="btn btn-outline-secondary">Quitter et reprendre plus tard</button>
                    <button class="btn btn-primary">Continuer</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="d-grid gap-4">
            <div class="demo-card">
              <p class="section-eyebrow mb-2">Télémétrie captée</p>
              <h2 class="h5 fw-bold mb-3">Signaux de difficulté</h2>
              <div v-for="item in telemetry" :key="item.label" class="telemetry-row">
                <div>
                  <p class="fw-semibold mb-1">{{ item.label }}</p>
                  <div class="progress-thin"><span :style="{ width: `${item.progress}%` }"></span></div>
                </div>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <div class="demo-card">
              <p class="section-eyebrow mb-2">Soumission unique</p>
              <h2 class="h5 fw-bold">Cycle de vie du lien</h2>
              <div class="timeline">
                <div class="timeline-item">
                  <strong>Email reçu</strong>
                  <p class="small muted mb-0">Lien signé, code à usage unique, expiration configurable.</p>
                </div>
                <div class="timeline-item">
                  <strong>Réponses en brouillon</strong>
                  <p class="small muted mb-0">Reprise autorisée tant que le questionnaire n’est pas soumis.</p>
                </div>
                <div class="timeline-item pb-0">
                  <strong>Soumission finale</strong>
                  <p class="small muted mb-0">Le code est verrouillé : aucune deuxième soumission possible.</p>
                </div>
              </div>
            </div>

            <div class="demo-card">
              <span class="badge-soft danger mb-3">Anonymat opérationnel</span>
              <p class="mb-0">
                Le front montre le code de session, jamais l’email du répondant. Les statistiques et
                exports exploitent uniquement les identifiants anonymes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
