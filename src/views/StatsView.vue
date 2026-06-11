<script setup lang="ts">
import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'

const bars = [62, 78, 48, 86, 54, 70, 91]

const questionStats = [
  { code: 'Q-014', label: 'Coordination inter-site', popup: '42 %', median: '01:42', alert: 'Ambiguïté forte' },
  { code: 'Q-019', label: 'Transmission des informations', popup: '18 %', median: '00:54', alert: 'Normal' },
  { code: 'Q-027', label: 'Commentaire libre final', popup: '6 %', median: '03:12', alert: 'Temps long attendu' },
]

const anonymousSubmissions = [
  { code: '8F4K-29QX', site: 'Montréal A', duration: '18:34', popups: 7, status: 'Soumis' },
  { code: '2VJ9-LP81', site: 'Paris C', duration: '12:08', popups: 2, status: 'Soumis' },
  { code: '7MA3-QD55', site: 'Tokyo H', duration: 'En cours', popups: 4, status: 'Brouillon' },
]
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Administrateurs"
        title="Panel statistique complet"
        description="Visualisation anonyme des soumissions, détection des questions difficiles, analyse par bâtiment et mesure des temps de réponse au niveau question/questionnaire."
      >
        <template #actions>
          <select class="form-select" aria-label="Questionnaire sélectionné">
            <option>Questionnaire CHPM · v1.4</option>
          </select>
          <button class="btn btn-primary">Exporter</button>
        </template>
      </PageHeader>
      <RoleGateInfo class="mb-4" />

      <div class="row g-4 mb-4">
        <div class="col-md-6 col-xl-3">
          <KpiCard label="Soumissions anonymes" value="1 284" detail="+14 % cette semaine" tone="success" />
        </div>
        <div class="col-md-6 col-xl-3">
          <KpiCard label="Temps médian questionnaire" value="16:21" detail="Objectif : 15–20 minutes" />
        </div>
        <div class="col-md-6 col-xl-3">
          <KpiCard label="Ouvertures popup/question" value="1.8" detail="Q-014 à surveiller" tone="warning" />
        </div>
        <div class="col-md-6 col-xl-3">
          <KpiCard label="Bâtiments actifs" value="42" detail="11 pays représentés" />
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <div>
                <p class="section-eyebrow mb-2">Analyse par question</p>
                <h2 class="h4 fw-bold mb-0">Temps et compréhension</h2>
              </div>
              <span class="badge-soft warning">3 alertes lexicales</span>
            </div>
            <div class="table-card">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Question</th>
                    <th>Popup</th>
                    <th>Temps médian</th>
                    <th>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in questionStats" :key="item.code">
                    <td>
                      <strong>{{ item.code }}</strong>
                      <div class="small muted">{{ item.label }}</div>
                    </td>
                    <td>{{ item.popup }}</td>
                    <td>{{ item.median }}</td>
                    <td>
                      <span
                        class="badge-soft"
                        :class="item.alert === 'Ambiguïté forte' ? 'danger' : 'success'"
                      >
                        {{ item.alert }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Réponses par bâtiment</p>
            <h2 class="h4 fw-bold mb-3">Volume de soumissions</h2>
            <div class="stat-chart mb-3" aria-label="Histogramme de soumissions">
              <span v-for="height in bars" :key="height" class="stat-bar" :style="{ height: `${height}%` }"></span>
            </div>
            <div class="map-grid" aria-label="Carte simplifiée des bâtiments">
              <span v-for="n in 50" :key="n" class="map-node" :class="{ active: n % 4 === 0, warning: n % 13 === 0 }"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-8">
          <div class="demo-card">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <div>
                <p class="section-eyebrow mb-2">Soumissions anonymes</p>
                <h2 class="h4 fw-bold mb-0">Consultation personne par personne, sans email</h2>
              </div>
              <button class="btn btn-outline-primary">Voir la soumission sélectionnée</button>
            </div>
            <div class="table-card">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Code unique</th>
                    <th>Site</th>
                    <th>Durée</th>
                    <th>Popups</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in anonymousSubmissions" :key="item.code">
                    <td class="fw-bold">{{ item.code }}</td>
                    <td>{{ item.site }}</td>
                    <td>{{ item.duration }}</td>
                    <td>{{ item.popups }}</td>
                    <td>
                      <span class="badge-soft" :class="item.status === 'Soumis' ? 'success' : 'warning'">
                        {{ item.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Notifications</p>
            <h2 class="h5 fw-bold">Préférences administrateur</h2>
            <div class="form-check form-switch mb-2">
              <input id="statsNotify" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label fw-semibold" for="statsNotify">Me notifier à chaque soumission</label>
            </div>
            <div class="form-check form-switch mb-2">
              <input id="weeklyDigest" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label fw-semibold" for="weeklyDigest">Digest hebdomadaire par bâtiment</label>
            </div>
            <div class="form-check form-switch mb-4">
              <input id="alerts" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label fw-semibold" for="alerts">Alerte si une question devient difficile</label>
            </div>
            <div class="p-3 rounded-4 bg-light border">
              <strong>Exemple d’alerte</strong>
              <p class="small muted mb-0 mt-1">
                “Q-014 dépasse 40 % d’ouverture popup sur trois bâtiments : revoir la formulation ou
                enrichir l’explication.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
