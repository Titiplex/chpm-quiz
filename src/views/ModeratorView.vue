<script setup lang="ts">
import { computed, onMounted } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'

const catalog = useCatalogStore()

onMounted(() => {
  void catalog.fetchCatalog()
})

const questionnaires = computed(() => catalog.publishedQuestionnaires)
const invitations = computed(() =>
  catalog.buildings.map((building, index) => ({
    building: building.label,
    sent: 84 - index * 14,
    completed: 61 - index * 9,
    pending: 18 - index * 3,
    blocked: 5 - index,
  })),
)
const totalSent = computed(() => invitations.value.reduce((total, item) => total + item.sent, 0))
const totalCompleted = computed(() =>
  invitations.value.reduce((total, item) => total + item.completed, 0),
)
const responseRate = computed(() => {
  if (totalSent.value === 0) {
    return '0 %'
  }

  return `${Math.round((totalCompleted.value / totalSent.value) * 100)} %`
})
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Modérateurs multi-sites"
        title="Envoi contrôlé des liens à usage unique"
        description="Les modérateurs sélectionnent les personnes à tester dans leur périmètre bâtiment/site, saisissent l’adresse mail et suivent l’état du lien sans accéder aux réponses nominatives."
        badge="RBAC serveur actif"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error }}
      </div>
      <div v-else class="alert alert-success rounded-4" role="status">
        Liste des bâtiments et questionnaires chargée depuis PostgreSQL. Un modérateur ne reçoit que
        son périmètre.
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Nouvelle invitation</p>
            <h2 class="h4 fw-bold mb-4">Créer un lien nominatif d’accès</h2>

            <label class="form-label fw-bold">Questionnaire</label>
            <select class="form-select mb-3" aria-label="Questionnaire">
              <option v-for="questionnaire in questionnaires" :key="questionnaire.id">
                {{ questionnaire.title }} · version {{ questionnaire.version }}
              </option>
            </select>

            <label class="form-label fw-bold">Bâtiment / site</label>
            <select class="form-select mb-3" aria-label="Bâtiment">
              <option v-for="building in catalog.buildings" :key="building.id">
                {{ building.label }}
              </option>
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
              Le formulaire reste non persistant cette semaine, mais ses listes proviennent déjà de
              l’API réelle. La création d’invitation complète sera la prochaine tranche logique.
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
                    <td>
                      <span class="badge-soft success">{{ item.completed }}</span>
                    </td>
                    <td>
                      <span class="badge-soft warning">{{ item.pending }}</span>
                    </td>
                    <td>
                      <span class="badge-soft danger">{{ item.blocked }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <KpiCard label="Taux de réponse global" :value="responseRate" />
              </div>
              <div class="col-md-4">
                <KpiCard label="Bâtiments visibles" :value="String(catalog.buildings.length)" />
              </div>
              <div class="col-md-4">
                <KpiCard label="Questionnaires publiés" :value="String(questionnaires.length)" />
              </div>
            </div>

            <div class="mt-4 p-3 rounded-4 bg-light border">
              <strong>Règle visible côté modérateur :</strong>
              <p class="muted mb-0 mt-1">
                le modérateur voit l’état d’invitation et le site, mais pas le contenu nominatif des
                réponses. Côté API, `/buildings` filtre son périmètre et les routes admin lui sont
                interdites.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
