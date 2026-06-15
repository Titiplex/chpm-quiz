<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useStatsStore } from '@/stores/stats'

const catalog = useCatalogStore()
const statsStore = useStatsStore()

const selectedQuestionnaireId = computed(() => catalog.publishedQuestionnaires[0]?.id ?? '')

onMounted(async () => {
  await catalog.fetchCatalog()
  if (selectedQuestionnaireId.value) {
    await statsStore.fetchForQuestionnaire(selectedQuestionnaireId.value)
  }
})

watch(selectedQuestionnaireId, async (id) => {
  if (id) await statsStore.fetchForQuestionnaire(id)
})
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Statistiques pseudonymisées"
        title="Pilotage réel avec seuils anti-réidentification"
        description="Les indicateurs sont calculés depuis les invitations, réponses, soumissions et événements de télémétrie PostgreSQL. Les ventilations faibles affichent “effectif insuffisant”."
        badge="Données réelles"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="statsStore.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ statsStore.error }}
      </div>

      <template v-if="statsStore.stats">
        <div class="alert alert-info rounded-4">
          Seuil d’agrégation actif : n ≥ {{ statsStore.stats.threshold }}. En dessous, les détails par bâtiment ou question doivent être masqués.
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <KpiCard label="Invités" :value="String(statsStore.stats.totals.invited)" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Commencés" :value="String(statsStore.stats.totals.started)" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Soumis" :value="String(statsStore.stats.totals.submitted)" tone="success" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Completion" :value="`${statsStore.stats.totals.completionRate} %`" />
          </div>
        </div>

        <div class="row g-4">
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Versions</p>
              <h2 class="h4 fw-bold mb-4">Comparaison des versions</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Version</th>
                      <th>Statut</th>
                      <th>Invités</th>
                      <th>Soumis</th>
                      <th>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="version in statsStore.stats.versions" :key="version.id">
                      <td class="fw-semibold">{{ version.versionLabel }}</td>
                      <td>{{ version.status }}</td>
                      <td>{{ version.invited }}</td>
                      <td>{{ version.submitted }}</td>
                      <td>{{ version.completionRate }} %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-xl-6">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Sites / bâtiments</p>
              <h2 class="h4 fw-bold mb-4">Ventilation seuillée</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Bâtiment</th>
                      <th>Invités</th>
                      <th>Soumis</th>
                      <th>Affichage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="building in statsStore.stats.buildings" :key="building.buildingId">
                      <td class="fw-semibold">{{ building.label }}</td>
                      <td>{{ building.invited ?? "—" }}</td>
                      <td>{{ building.submitted ?? "—" }}</td>
                      <td>
                        <span class="badge-soft" :class="{ success: building.effectifSufficient, warning: !building.effectifSufficient }">
                          {{ building.displayValue }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-12">
            <div class="demo-card">
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
                <div>
                  <p class="section-eyebrow mb-2">Questions et popups</p>
                  <h2 class="h4 fw-bold mb-0">Signaux de compréhension</h2>
                </div>
                <span class="badge-soft warning">{{ statsStore.stats.totals.popupOpens }} ouverture(s) popup</span>
              </div>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Réponses</th>
                      <th>Popups</th>
                      <th>Règle</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="question in statsStore.stats.questions" :key="question.id">
                      <td>
                        <strong>{{ question.code }}</strong>
                        <div class="small muted">{{ question.label }}</div>
                      </td>
                      <td>{{ question.responseType }}</td>
                      <td>{{ question.answerCount ?? "—" }}</td>
                      <td>{{ question.popupOpens ?? "—" }}</td>
                      <td>
                        <span class="badge-soft" :class="{ success: question.effectifSufficient, warning: !question.effectifSufficient }">
                          {{ question.displayValue }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
