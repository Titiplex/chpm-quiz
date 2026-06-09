<script setup lang="ts">
const invitations = [
  { building: 'Montréal · Bâtiment A', sent: 84, completed: 61, pending: 18, blocked: 5 },
  { building: 'Paris · Bâtiment C', sent: 53, completed: 41, pending: 10, blocked: 2 },
  { building: 'Tokyo · Bâtiment H', sent: 37, completed: 26, pending: 9, blocked: 2 },
]
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div>
          <p class="section-eyebrow mb-2">Modérateurs multi-sites</p>
          <h1 class="h2 fw-bold mb-1">Envoi contrôlé des liens à usage unique</h1>
          <p class="muted mb-0">
            Les modérateurs sélectionnent les personnes à tester dans leur périmètre bâtiment/site,
            saisissent l’adresse mail et suivent l’état du lien sans accéder aux réponses nominatives.
          </p>
        </div>
        <span class="badge-soft">Rôle : modérateur régional</span>
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Nouvelle invitation</p>
            <h2 class="h4 fw-bold mb-4">Créer un lien nominatif d’accès</h2>

            <label class="form-label fw-bold">Questionnaire</label>
            <select class="form-select mb-3" aria-label="Questionnaire">
              <option>Questionnaire CHPM · version 1.4</option>
              <option>Questionnaire pilote · version 0.9</option>
            </select>

            <label class="form-label fw-bold">Bâtiment / site</label>
            <select class="form-select mb-3" aria-label="Bâtiment">
              <option>Montréal · Bâtiment A</option>
              <option>Paris · Bâtiment C</option>
              <option>Tokyo · Bâtiment H</option>
            </select>

            <label class="form-label fw-bold">Adresse email du répondant</label>
            <input class="form-control mb-3" value="personne.exemple@domaine.org" />

            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input id="notifyModerator" class="form-check-input" type="checkbox" checked />
                  <label class="form-check-label fw-semibold" for="notifyModerator">
                    Notifier le modérateur à la réponse
                  </label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input id="notifyAdmin" class="form-check-input" type="checkbox" />
                  <label class="form-check-label fw-semibold" for="notifyAdmin">
                    Notifier les administrateurs
                  </label>
                </div>
              </div>
            </div>

            <button class="btn btn-primary w-100 btn-lg">Envoyer le lien sécurisé</button>
            <p class="small muted mt-3 mb-0">
              Action simulée : la maquette représente l’envoi email, la génération du code unique et
              l’association email ↔ code dans une base séparée.
            </p>
          </div>
        </div>

        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Suivi opérationnel</p>
                <h2 class="h4 fw-bold mb-0">Invitations par bâtiment</h2>
              </div>
              <button class="btn btn-outline-primary">Exporter la vue agrégée</button>
            </div>

            <div class="table-card mb-4">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Site</th>
                    <th>Envoyés</th>
                    <th>Soumis</th>
                    <th>En attente</th>
                    <th>Bloqués</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in invitations" :key="item.building">
                    <td class="fw-semibold">{{ item.building }}</td>
                    <td>{{ item.sent }}</td>
                    <td><span class="badge-soft success">{{ item.completed }}</span></td>
                    <td><span class="badge-soft warning">{{ item.pending }}</span></td>
                    <td><span class="badge-soft danger">{{ item.blocked }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <div class="kpi-card h-100">
                  <span>Taux de réponse global</span>
                  <strong>73 %</strong>
                </div>
              </div>
              <div class="col-md-4">
                <div class="kpi-card h-100">
                  <span>Liens réactivables</span>
                  <strong>37</strong>
                </div>
              </div>
              <div class="col-md-4">
                <div class="kpi-card h-100">
                  <span>Soumissions verrouillées</span>
                  <strong>128</strong>
                </div>
              </div>
            </div>

            <div class="mt-4 p-3 rounded-4 bg-light border">
              <strong>Règle visible côté modérateur :</strong>
              <p class="muted mb-0 mt-1">
                le modérateur voit l’état d’invitation et le site, mais pas le contenu nominatif des
                réponses. Les réponses sont accessibles anonymement selon les droits administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
