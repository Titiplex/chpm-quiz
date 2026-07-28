<script setup lang="ts">
import { computed, onMounted } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageSectionNav from '@/components/common/PageSectionNav.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { formatDate as formatLocaleDate, t, tp } from '@/i18n'
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
const canMaintainScopedData = computed(() =>
  ['admin', 'technical_admin'].includes(session.currentRole),
)
const canRunRetention = computed(() => session.currentRole === 'technical_admin')
const canExport = computed(() => ['admin', 'analyst'].includes(session.currentRole))

const complianceSections = computed<PageSectionNavItem[]>(() => [
  { id: 'compliance-register', label: t('compliance.section.register'), hint: t('compliance.section.registerHint') },
  { id: 'compliance-retention', label: t('compliance.section.retention'), hint: t('compliance.section.retentionHint') },
  ...(canExport.value ? [{ id: 'compliance-export', label: t('compliance.section.export'), hint: t('compliance.section.exportHint') }] : []),
  { id: 'compliance-audit', label: t('compliance.section.audit'), hint: t('compliance.section.auditHint') },
])

onMounted(async () => {
  await Promise.all([
    canExport.value && catalog.status === 'idle' ? catalog.fetchCatalog() : Promise.resolve(),
    compliance.fetchAll(),
  ])
})

function formatDate(value: string | null | undefined): string {
  return value ? formatLocaleDate(value, { dateStyle: 'short', timeStyle: 'short' }) : '—'
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :eyebrow="t('compliance.header.eyebrow')"
        :title="t('compliance.header.title')"
        :description="t('compliance.header.description')"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="compliance.error" class="alert alert-danger rounded-4" role="alert">
        {{ compliance.error }}
      </div>
      <div v-if="compliance.message" class="alert alert-success rounded-4" role="status">
        {{ compliance.message }}
      </div>
      <div v-if="compliance.status === 'loading'" class="demo-card text-center py-5">
        {{ t('compliance.loading') }}
      </div>

      <div class="page-workspace">
        <PageSectionNav :title="t('compliance.navigation')" :sections="complianceSections" />
        <div class="page-workspace-main">
          <div class="row g-4">
            <div id="compliance-register" class="page-section col-xl-7">
              <CollapsibleSection
                :eyebrow="t('compliance.register.eyebrow')"
                :title="t('compliance.register.title')"
                :badge="t('compliance.register.badge')"
                badge-tone="success"
                body-class="content-scroll content-scroll-sm"
              >
                <div v-if="!compliance.register" class="empty-state">
                  <strong>{{ t('compliance.register.unavailable') }}</strong>
                  <p class="muted mb-0">{{ t('compliance.register.retry') }}</p>
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
                      <strong>{{ t('compliance.register.lawfulBasis') }}</strong> {{ processing.lawfulBasis }}
                    </div>
                    <div class="small">
                      <strong>{{ t('compliance.register.data') }}</strong> {{ processing.dataCategories.join(', ') }}
                    </div>
                    <div class="small">
                      <strong>{{ t('compliance.register.recipients') }}</strong> {{ processing.recipients.join(', ') }}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div id="compliance-retention" class="page-section col-xl-5">
              <CollapsibleSection
                :eyebrow="t('compliance.retention.eyebrow')"
                :title="t('compliance.retention.title')"
                body-class="content-scroll content-scroll-sm"
              >
                <div v-if="!compliance.policy" class="empty-state compact">
                  {{ t('compliance.retention.unavailable') }}
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
                <div v-if="canMaintainScopedData" class="d-flex flex-wrap gap-2 mt-4">
                  <button
                    class="btn btn-outline-primary rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.expireInvitations"
                  >
                    {{ t('compliance.retention.expireInvitations') }}
                  </button>
                  <button
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.cleanupDrafts"
                  >
                    {{ t('compliance.retention.cleanupDrafts') }}
                  </button>
                  <button
                    v-if="canRunRetention"
                    class="btn btn-outline-danger rounded-pill"
                    type="button"
                    :disabled="compliance.status === 'saving'"
                    @click="compliance.runRetention"
                  >
                    {{ t('compliance.retention.run') }}
                  </button>
                </div>
                <p v-else class="small muted mt-4 mb-0">
                  {{ t('compliance.retention.readOnly') }}
                </p>
              </CollapsibleSection>
            </div>

            <div v-if="canExport" id="compliance-export" class="page-section col-xl-5">
              <CollapsibleSection
                :eyebrow="t('compliance.export.eyebrow')"
                :title="t('compliance.export.title')"
                :default-open="false"
              >
                <p class="muted">
                  {{ t('compliance.export.description') }}
                </p>
                <button
                  class="btn btn-primary rounded-pill"
                  type="button"
                  :disabled="compliance.status === 'saving' || !selectedQuestionnaireId"
                  @click="compliance.fetchPseudonymizedExport(selectedQuestionnaireId)"
                >
                  {{ t('compliance.export.generate') }}
                </button>

                <div v-if="compliance.exportPayload" class="mt-4 p-3 rounded-4 border bg-white">
                  <strong>{{ compliance.exportPayload.questionnaire.title }}</strong>
                  <div class="small muted">
                    {{
                      compliance.exportPayload.displayValue ??
                      tp('compliance.export.rows', compliance.exportPayload.rowCount)
                    }}
                    · {{ t('compliance.export.fingerprint', { fingerprint: compliance.exportPayload.fingerprint }) }}
                  </div>
                  <div v-if="compliance.exportPayload.secureDocument" class="small muted mt-1">
                    {{ t('compliance.export.vault', { storageRef: compliance.exportPayload.secureDocument.storageRef, expiresAt: formatDate(compliance.exportPayload.secureDocument.expiresAt) }) }}
                  </div>
                  <div
                    v-if="compliance.exportPayload.suppressedByThreshold"
                    class="alert alert-warning rounded-4 py-2 mt-2 mb-0"
                  >
                    {{ t('compliance.export.suppressed', { threshold: compliance.exportPayload.threshold }) }}
                  </div>
                  <div class="small mt-2">
                    {{ t('compliance.export.directEmail', { state: compliance.exportPayload.containsDirectEmail ? t('compliance.export.present') : t('compliance.export.absent'), excluded: compliance.exportPayload.identityVaultExcluded ? t('common.yes') : t('common.no') }) }}
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div id="compliance-audit" class="page-section col-xl-7">
              <CollapsibleSection
                :eyebrow="t('compliance.audit.eyebrow')"
                :title="t('compliance.audit.title')"
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
                      {{ t('common.refresh') }}
                    </button>
                  </div>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead class="table-light">
                        <tr>
                          <th>{{ t('compliance.audit.date') }}</th>
                          <th>{{ t('compliance.audit.action') }}</th>
                          <th>{{ t('compliance.audit.entity') }}</th>
                          <th>{{ t('compliance.audit.code') }}</th>
                          <th>{{ t('compliance.audit.actor') }}</th>
                          <th>{{ t('compliance.audit.justification') }}</th>
                          <th>{{ t('compliance.audit.correlation') }}</th>
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
                            {{ log.actor?.displayName ?? log.actorUserId ?? t('compliance.audit.system') }}
                            <span v-if="log.actorRole">({{ log.actorRole }})</span>
                          </td>
                          <td class="small muted">{{ log.justification ?? '—' }}</td>
                          <td class="small muted">{{ log.correlationId ?? '—' }}</td>
                        </tr>
                        <tr v-if="!compliance.auditLogs.length">
                          <td colspan="7" class="text-center muted py-4">
                            {{ t('compliance.audit.empty') }}
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
