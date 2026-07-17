<script setup lang="ts">
import { computed, onMounted } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageSectionNav from '@/components/common/PageSectionNav.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useComplianceStore } from '@/stores/compliance'
import { useSessionStore } from '@/stores/session'

type PageSectionNavItem = {
  id: string
  label: string
  hint?: string
}

const catalog = useCatalogStore()
const compliance = useComplianceStore()
const session = useSessionStore()

const selectedQuestionnaireId = computed(() => catalog.questionnaires[0]?.id ?? '')
const canMaintain = computed(() => session.hasPermission('compliance:maintain'))

const complianceSections: PageSectionNavItem[] = [
  { id: 'compliance-register', label: 'Registre', hint: 'Traitements' },
  { id: 'compliance-retention', label: 'Conservation', hint: 'Maintenance' },
  { id: 'compliance-export', label: 'Export', hint: 'Pseudonymisé' },
  { id: 'compliance-audit', label: 'Audit', hint: 'Événements' },
]

onMounted(async () => {
  await Promise.all([
    catalog.status === 'idle' ? catalog.fetchCatalog() : Promise.resolve(),
    compliance.fetchAll(),
  ])
})

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="RGPD / sécurité"
        title="Registre technique, conservation et preuves d’audit"
        description="Consultez le registre des traitements, la politique de conservation, les exports pseudonymisés et les journaux d’audit."
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

      <div class="page-workspace">
        <PageSectionNav title="Navigation RGPD" :sections="complianceSections" />
        <div class="page-workspace-main">
          <div class="row g-4">
            <div id="compliance-register" class="page-section col-xl-7">
              <CollapsibleSection
                eyebrow="Registre technique simplifié"
                title="Traitements et cloisonnement"
                badge="Email exclu du dashboard métier"
                badge-tone="success"
                body-class="content-scroll content-scroll-sm"
              >
                <div v-if="!compliance.register" class="empty-state">
                  <strong>Registre indisponible.</strong>
                  <p class="muted mb-0">Vérifiez vos permissions ou réessayez ultérieurement.</p>
                </div>
                <div v-else class="compact-list">
                  <div
                    v-for="processing in compliance.register.processing"
                    :key="processing.name"
                    class="compact-list-item p-3 rounded-4 border bg-white"
                  >
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                      <strong>{{ processing.name }}</strong>
                      <span class="badge-soft">{{ processing.storage }}</span>
                    </div>
                    <p class="muted mb-2">{{ processing.finality }}</p>
                    <div class="small">
                      <strong>Base légale :</strong> {{ processing.lawfulBasis }}
                    </div>
                    <div class="small">
                      <strong>Données :</strong> {{ processing.dataCategories.join(', ') }}
                    </div>
                    <div class="small">
                      <strong>Destinataires :</strong> {{ processing.recipients.join(', ') }}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div id="compliance-retention" class="page-section col-xl-5">
              <CollapsibleSection
                eyebrow="Conservation"
                title="Règles MVP"
                body-class="content-scroll content-scroll-sm"
              >
                <div v-if="!compliance.policy" class="empty-state compact">
                  Politique de conservation indisponible.
                </div>
                <div v-else class="timeline">
                  <div
                    v-for="rule in compliance.policy.rules"
                    :key="rule.object"
                    class="timeline-item"
                  >
                    <strong>{{ rule.object }}</strong>
                    <p class="small muted mb-1">{{ rule.retention }}</p>
                    <p class="small mb-0">{{ rule.action }}</p>
                  </div>
                </div>
                <div v-if="canMaintain" class="d-flex flex-wrap gap-2 mt-4">
                  <button
                    class="btn btn-outline-primary rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.expireInvitations"
                  >
                    Expirer les invitations échues
                  </button>
                  <button
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.cleanupDrafts"
                  >
                    Nettoyer les brouillons expirés
                  </button>
                  <button
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.purgeExpiredTokens"
                  >
                    Purger les tokens expirés
                  </button>
                  <button
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.purgeExpiredExports"
                  >
                    Purger les exports expirés
                  </button>
                  <button
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.purgeOutOfRetentionData"
                  >
                    Purger les données hors conservation
                  </button>
                </div>
                <p v-else class="small muted mt-4 mb-0">
                  Votre rôle peut consulter la conformité mais pas exécuter les traitements de
                  maintenance.
                </p>
              </CollapsibleSection>
            </div>

            <div id="compliance-export" class="page-section col-xl-5">
              <CollapsibleSection
                eyebrow="Export pseudonymisé"
                title="Soumissions sans coffre email"
                :default-open="false"
              >
                <p class="muted">
                  L’export exclut la table identity.email_identities. Les réponses signalées comme
                  potentiellement identifiantes sont masquées pour éviter toute ré-identification
                  accidentelle.
                </p>
                <button
                  class="btn btn-primary rounded-pill"
                  type="button"
                  :disabled="compliance.status === 'saving' || !selectedQuestionnaireId"
                  @click="compliance.fetchPseudonymizedExport(selectedQuestionnaireId)"
                >
                  Générer l’export pseudonymisé
                </button>

                <div v-if="compliance.exportPayload" class="mt-4 p-3 rounded-4 border bg-white">
                  <strong>{{ compliance.exportPayload.questionnaire.title }}</strong>
                  <div class="small muted">
                    {{
                      compliance.exportPayload.displayValue ??
                      `${compliance.exportPayload.rowCount} ligne(s)`
                    }}
                    · empreinte fichier {{ compliance.exportPayload.fingerprint }}
                  </div>
                  <div v-if="compliance.exportPayload.secureDocument" class="small muted mt-1">
                    Coffre : {{ compliance.exportPayload.secureDocument.storageRef }} · expiration
                    {{ formatDate(compliance.exportPayload.secureDocument.expiresAt) }}
                  </div>
                  <div
                    v-if="compliance.exportPayload.suppressedByThreshold"
                    class="alert alert-warning rounded-4 py-2 mt-2 mb-0"
                  >
                    Export détaillé masqué : effectif inférieur au seuil anti-réidentification ({{
                      compliance.exportPayload.threshold
                    }}).
                  </div>
                  <div class="small mt-2">
                    Email direct :
                    {{ compliance.exportPayload.containsDirectEmail ? 'présent' : 'absent' }} ·
                    coffre identité exclu :
                    {{ compliance.exportPayload.identityVaultExcluded ? 'oui' : 'non' }}.
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div id="compliance-audit" class="page-section col-xl-7">
              <CollapsibleSection
                eyebrow="Audit consultable"
                title="Derniers événements sensibles"
                :default-open="false"
                body-class="compact"
              >
                <template #default>
                  <div class="d-flex justify-content-end mb-3">
                    <button
                      class="btn btn-outline-primary rounded-pill"
                      type="button"
                      @click="compliance.fetchAll()"
                    >
                      Actualiser
                    </button>
                  </div>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead class="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Action</th>
                          <th>Entité</th>
                          <th>Code</th>
                          <th>Acteur</th>
                          <th>Justification</th>
                          <th>Correlation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="log in compliance.auditLogs" :key="log.id">
                          <td class="small">{{ formatDate(log.occurredAt) }}</td>
                          <td>
                            <span class="badge-soft warning">{{ log.action }}</span>
                          </td>
                          <td>{{ log.entityType }}</td>
                          <td class="fw-semibold">{{ log.publicCode ?? '—' }}</td>
                          <td class="small muted">
                            {{ log.actor?.displayName ?? log.actorUserId ?? 'système' }}
                            <span v-if="log.actorRole">({{ log.actorRole }})</span>
                          </td>
                          <td class="small muted">{{ log.justification ?? '—' }}</td>
                          <td class="small muted">{{ log.correlationId ?? '—' }}</td>
                        </tr>
                        <tr v-if="!compliance.auditLogs.length">
                          <td colspan="7" class="text-center muted py-4">
                            Aucun événement d’audit consultable.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
