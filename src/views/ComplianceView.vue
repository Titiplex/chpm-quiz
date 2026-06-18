<script setup lang="ts">
import { computed, onMounted } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useComplianceStore } from '@/stores/compliance'
import { useSessionStore } from '@/stores/session'

const catalog = useCatalogStore()
const compliance = useComplianceStore()
const session = useSessionStore()

const selectedQuestionnaireId = computed(() => catalog.questionnaires[0]?.id ?? '')
const canMaintain = computed(() => session.hasPermission('compliance:maintain'))

onMounted(async () => {
  await Promise.all([
    catalog.status === 'idle' ? catalog.fetchCatalog() : Promise.resolve(),
    compliance.fetchAll(),
  ])
})

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="RGPD / sécurité"
        title="Registre technique, conservation et preuves d’audit"
        description="Cette page matérialise les éléments de conformité attendus pour la démonstration finale : registre de traitements simplifié, politique de conservation, export pseudonymisé, maintenance d’expiration et journaux consultables."
        badge="Semaine 7"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="compliance.error" class="alert alert-danger rounded-4" role="alert">
        {{ compliance.error }}
      </div>
      <div v-if="compliance.message" class="alert alert-success rounded-4" role="status">
        {{ compliance.message }}
      </div>
      <div v-if="compliance.status === 'loading'" class="demo-card text-center py-5">
        Chargement du registre RGPD…
      </div>

      <div class="row g-4">
        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Registre technique simplifié</p>
                <h2 class="h4 fw-bold mb-0">Traitements et cloisonnement</h2>
              </div>
              <span class="badge-soft success">Email exclu du dashboard métier</span>
            </div>

            <div v-if="!compliance.register" class="empty-state">
              <strong>Registre indisponible.</strong>
              <p class="muted mb-0">Vérifie les permissions du rôle courant ou le backend.</p>
            </div>
            <div v-else class="d-grid gap-3">
              <div v-for="processing in compliance.register.processing" :key="processing.name" class="p-3 rounded-4 border bg-white">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <strong>{{ processing.name }}</strong>
                  <span class="badge-soft">{{ processing.storage }}</span>
                </div>
                <p class="muted mb-2">{{ processing.finality }}</p>
                <div class="small"><strong>Base légale :</strong> {{ processing.lawfulBasis }}</div>
                <div class="small"><strong>Données :</strong> {{ processing.dataCategories.join(', ') }}</div>
                <div class="small"><strong>Destinataires :</strong> {{ processing.recipients.join(', ') }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Conservation</p>
            <h2 class="h4 fw-bold mb-4">Règles MVP</h2>
            <div v-if="!compliance.policy" class="empty-state compact">
              Politique de conservation indisponible.
            </div>
            <div v-else class="timeline">
              <div v-for="rule in compliance.policy.rules" :key="rule.object" class="timeline-item">
                <strong>{{ rule.object }}</strong>
                <p class="small muted mb-1">{{ rule.retention }}</p>
                <p class="small mb-0">{{ rule.action }}</p>
              </div>
            </div>
            <div v-if="canMaintain" class="d-flex flex-wrap gap-2 mt-4">
              <button class="btn btn-outline-primary rounded-pill" type="button" :disabled="compliance.status === 'saving'" @click="compliance.expireInvitations">
                Expirer les invitations échues
              </button>
              <button class="btn btn-outline-danger rounded-pill" type="button" :disabled="compliance.status === 'saving'" @click="compliance.cleanupDrafts">
                Nettoyer les brouillons expirés
              </button>
            </div>
            <p v-else class="small muted mt-4 mb-0">
              Votre rôle peut consulter la conformité mais pas exécuter les traitements de maintenance.
            </p>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Export pseudonymisé</p>
            <h2 class="h4 fw-bold mb-3">Soumissions sans coffre email</h2>
            <p class="muted">
              L’export exclut la table identity.email_identities. Les réponses signalées comme potentiellement identifiantes sont masquées pour éviter toute ré-identification accidentelle.
            </p>
            <button class="btn btn-primary rounded-pill" type="button" :disabled="compliance.status === 'saving' || !selectedQuestionnaireId" @click="compliance.fetchPseudonymizedExport(selectedQuestionnaireId)">
              Générer l’export pseudonymisé
            </button>

            <div v-if="compliance.exportPayload" class="mt-4 p-3 rounded-4 border bg-white">
              <strong>{{ compliance.exportPayload.questionnaire.title }}</strong>
              <div class="small muted">{{ compliance.exportPayload.displayValue ?? `${compliance.exportPayload.rowCount} ligne(s)` }} · empreinte {{ compliance.exportPayload.fingerprint }}</div>
              <div v-if="compliance.exportPayload.suppressedByThreshold" class="alert alert-warning rounded-4 py-2 mt-2 mb-0">
                Export détaillé masqué : effectif inférieur au seuil anti-réidentification ({{ compliance.exportPayload.threshold }}).
              </div>
              <div class="small mt-2">
                Email direct : {{ compliance.exportPayload.containsDirectEmail ? 'présent' : 'absent' }} · coffre identité exclu : {{ compliance.exportPayload.identityVaultExcluded ? 'oui' : 'non' }}.
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Audit consultable</p>
                <h2 class="h4 fw-bold mb-0">Derniers événements sensibles</h2>
              </div>
              <button class="btn btn-outline-primary rounded-pill" type="button" @click="compliance.fetchAll()">
                Actualiser
              </button>
            </div>
            <div class="table-card">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>Code</th>
                    <th>Acteur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in compliance.auditLogs" :key="log.id">
                    <td class="small">{{ formatDate(log.occurredAt) }}</td>
                    <td><span class="badge-soft warning">{{ log.action }}</span></td>
                    <td>{{ log.entityType }}</td>
                    <td class="fw-semibold">{{ log.publicCode ?? '—' }}</td>
                    <td class="small muted">{{ log.actor?.displayName ?? log.actorUserId ?? 'système' }}</td>
                  </tr>
                  <tr v-if="!compliance.auditLogs.length">
                    <td colspan="5" class="text-center muted py-4">Aucun événement d’audit consultable.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
