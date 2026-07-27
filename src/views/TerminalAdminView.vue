<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { formatDate as formatLocaleDate, t, tp } from '@/i18n'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { useTerminalAdminStore } from '@/stores/terminalAdmin'
import type { ApiTerminalDevice } from '@shared/types/api'
import type { TerminalDeviceStatus } from '@shared/types/domain'

const catalog = useCatalogStore()
const session = useSessionStore()
const terminalAdmin = useTerminalAdminStore()
const copiedLink = ref(false)
const showCreateTerminalModal = ref(false)
const editedLabels = reactive<Record<string, string>>({})

const form = reactive({
  buildingId: '',
  label: t('terminalAdmin.form.labelPlaceholder'),
})

const activeDevices = computed(() =>
  terminalAdmin.terminalDevices.filter((device) => device.status === 'active'),
)
const inactiveDevices = computed(() =>
  terminalAdmin.terminalDevices.filter((device) => device.status !== 'active'),
)
const canAdministerTerminals = computed(() => session.hasPermission('terminal:administer'))
const lastLaunchLinkTitle = computed(() =>
  terminalAdmin.lastLaunchLinkAction === 'regenerated'
    ? t('terminalAdmin.link.regeneratedTitle')
    : t('terminalAdmin.link.createdTitle'),
)
const lastLaunchLinkDescription = computed(() =>
  terminalAdmin.lastLaunchLinkAction === 'regenerated'
    ? t('terminalAdmin.link.regeneratedDescription')
    : t('terminalAdmin.link.createdDescription'),
)

onMounted(async () => {
  await Promise.all([catalog.fetchCatalog(), terminalAdmin.fetchTerminalDevices()])
  form.buildingId = catalog.buildings[0]?.id ?? ''

  for (const device of terminalAdmin.terminalDevices) {
    editedLabels[device.id] = device.label
  }
})

async function createTerminal(): Promise<void> {
  copiedLink.value = false
  const response = await terminalAdmin.createTerminalDevice({
    buildingId: form.buildingId,
    label: form.label,
  })
  editedLabels[response.terminalDevice.id] = response.terminalDevice.label
}

async function updateLabel(device: ApiTerminalDevice): Promise<void> {
  const label = editedLabels[device.id]?.trim()
  if (!label || label === device.label) return
  await terminalAdmin.updateTerminalDevice(device.id, { label })
}

async function updateStatus(
  device: ApiTerminalDevice,
  status: TerminalDeviceStatus,
): Promise<void> {
  await terminalAdmin.updateTerminalDevice(device.id, { status })
}

async function revoke(device: ApiTerminalDevice): Promise<void> {
  await terminalAdmin.revokeTerminalDevice(device.id)
}

async function regenerate(device: ApiTerminalDevice): Promise<void> {
  copiedLink.value = false
  await terminalAdmin.regenerateTerminalToken(device.id)
}

async function copyLastLaunchLink(): Promise<void> {
  if (!terminalAdmin.lastLaunchLink) return
  await navigator.clipboard?.writeText(terminalAdmin.lastLaunchLink)
  copiedLink.value = true
}

function clearLastLaunchLink(): void {
  copiedLink.value = false
  terminalAdmin.clearLastLaunchLink()
}

function statusLabel(status: TerminalDeviceStatus): string {
  const labels: Record<TerminalDeviceStatus, string> = {
    active: t('terminalAdmin.status.active'),
    paused: t('terminalAdmin.status.paused'),
    revoked: t('terminalAdmin.status.revoked'),
  }
  return labels[status]
}

function statusTone(status: TerminalDeviceStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  if (status === 'revoked') return 'danger'
  return 'neutral'
}

function formatDate(value?: string | null): string {
  return value
    ? formatLocaleDate(value, { dateStyle: 'short', timeStyle: 'short' })
    : t('common.never')
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :eyebrow="t('terminalAdmin.header.eyebrow')"
        :title="t('terminalAdmin.header.title')"
        :description="t('terminalAdmin.header.description')"
        :badge="t('terminalAdmin.header.badge')"
      >
        <template #actions>
          <button
            v-if="canAdministerTerminals"
            class="btn btn-primary"
            type="button"
            @click="showCreateTerminalModal = true"
          >
            {{ t('terminalAdmin.create.open') }}
          </button>
        </template>
      </PageHeader>
      <RoleGateInfo class="mb-4" />

      <div
        v-if="terminalAdmin.status === 'error'"
        class="alert alert-danger rounded-4"
        role="alert"
      >
        {{ terminalAdmin.error }}
      </div>
      <div v-else class="alert alert-info rounded-4" role="status">
        {{ t('terminalAdmin.info') }}
      </div>

      <div v-if="terminalAdmin.lastLaunchLink" class="alert alert-success rounded-4" role="status">
        <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
          <div class="flex-grow-1">
            <strong>{{ lastLaunchLinkTitle }}</strong>
            <p class="small muted mt-1 mb-2">{{ lastLaunchLinkDescription }}</p>
            <p v-if="terminalAdmin.lastLaunchLinkDevice" class="small mb-2">
              {{ t('terminalAdmin.link.device', { label: terminalAdmin.lastLaunchLinkDevice.label }) }}
              <span class="muted">
                · {{ terminalAdmin.lastLaunchLinkDevice.code }} ·
                {{ terminalAdmin.lastLaunchLinkDevice.building.label }}</span
              >
            </p>
            <a
              class="d-block text-break"
              :href="terminalAdmin.lastLaunchLink"
              target="_blank"
              rel="noreferrer"
            >
              {{ terminalAdmin.lastLaunchLink }}
            </a>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button
              class="btn btn-sm btn-outline-primary"
              type="button"
              @click="copyLastLaunchLink"
            >
              {{ copiedLink ? t('terminalAdmin.link.copied') : t('terminalAdmin.link.copy') }}
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              @click="clearLastLaunchLink"
            >
              {{ t('common.hide') }}
            </button>
          </div>
        </div>
      </div>

      <ModalPanel
        v-if="canAdministerTerminals"
        v-model="showCreateTerminalModal"
        :title="t('terminalAdmin.create.title')"
        :eyebrow="t('terminalAdmin.create.eyebrow')"
        :description="t('terminalAdmin.create.description')"
        size="md"
      >
        <form @submit.prevent="createTerminal">
          <label class="form-label fw-bold" for="terminal-building">{{ t('terminalAdmin.create.building') }}</label>
          <select
            id="terminal-building"
            v-model="form.buildingId"
            class="form-select mb-3"
            required
          >
            <option value="" disabled>{{ t('terminalAdmin.create.chooseBuilding') }}</option>
            <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
              {{ building.label }} · {{ building.city }}
            </option>
          </select>

          <label class="form-label fw-bold" for="terminal-label">{{ t('terminalAdmin.create.label') }}</label>
          <input
            id="terminal-label"
            v-model="form.label"
            class="form-control mb-3"
            required
            minlength="2"
            maxlength="120"
          />
          <p class="small muted mb-4">
            {{ t('terminalAdmin.create.example') }}
          </p>

          <button
            class="btn btn-primary w-100 btn-lg"
            type="submit"
            :disabled="terminalAdmin.status === 'saving' || !form.buildingId"
          >
            {{
              terminalAdmin.status === 'saving' ? t('projectAdmin.site.creating') : t('terminalAdmin.create.submit')
            }}
          </button>

          <div
            v-if="terminalAdmin.lastLaunchLink && terminalAdmin.lastLaunchLinkAction === 'created'"
            class="alert alert-success rounded-4 mt-3 mb-0"
          >
            <strong>{{ lastLaunchLinkTitle }}</strong>
            <p class="small muted mt-1 mb-2">{{ lastLaunchLinkDescription }}</p>
            <a
              class="d-block text-break"
              :href="terminalAdmin.lastLaunchLink"
              target="_blank"
              rel="noreferrer"
            >
              {{ terminalAdmin.lastLaunchLink }}
            </a>
            <button
              class="btn btn-sm btn-outline-primary mt-2"
              type="button"
              @click="copyLastLaunchLink"
            >
              {{ copiedLink ? t('terminalAdmin.link.copied') : t('terminalAdmin.link.copyTerminal') }}
            </button>
          </div>
        </form>
      </ModalPanel>

      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <KpiCard :label="t('terminalAdmin.kpi.total')" :value="String(terminalAdmin.totals.total)" />
        </div>
        <div class="col-md-3">
          <KpiCard :label="t('terminalAdmin.kpi.active')" :value="String(terminalAdmin.totals.active)" tone="success" />
        </div>
        <div class="col-md-3">
          <KpiCard :label="t('terminalAdmin.kpi.paused')" :value="String(terminalAdmin.totals.paused)" tone="warning" />
        </div>
        <div class="col-md-3">
          <KpiCard :label="t('terminalAdmin.kpi.pending')" :value="String(terminalAdmin.totals.pendingInvitations)" />
        </div>
      </div>

      <div class="action-strip mb-4">
        <div>
          <p class="section-eyebrow mb-1">{{ t('terminalAdmin.create.eyebrow') }}</p>
          <h2 class="action-strip-title">{{ t('terminalAdmin.pairing.title') }}</h2>
          <p class="action-strip-description">
            {{ t('terminalAdmin.pairing.description') }}
          </p>
        </div>
        <button
          v-if="canAdministerTerminals"
          class="btn btn-primary"
          type="button"
          @click="showCreateTerminalModal = true"
        >
          {{ t('terminalAdmin.create.open') }}
        </button>
        <p v-else class="muted mb-0">
          {{ t('terminalAdmin.readOnly') }}
        </p>
      </div>

      <CollapsibleSection
        :title="t('terminalAdmin.active.title')"
        :eyebrow="t('terminalAdmin.active.eyebrow')"
        :badge="tp('common.active', activeDevices.length)"
        badge-tone="success"
        body-class="compact"
      >
        <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <p class="muted mb-0">
            {{ t('terminalAdmin.active.description') }}
          </p>
          <button
            class="btn btn-outline-primary"
            type="button"
            @click="terminalAdmin.fetchTerminalDevices"
          >
            {{ t('common.refresh') }}
          </button>
        </div>

        <div v-if="!activeDevices.length" class="alert alert-light border rounded-4">
          {{ t('terminalAdmin.active.empty') }}
        </div>

        <div v-else class="content-scroll content-scroll-lg">
          <div v-for="device in activeDevices" :key="device.id" class="border rounded-4 p-3 mb-3">
            <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
              <div class="flex-grow-1">
                <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                  <span class="badge-soft" :class="statusTone(device.status)">{{
                    statusLabel(device.status)
                  }}</span>
                  <span class="small muted">{{ device.code }}</span>
                </div>
                <label class="form-label fw-bold small" :for="`label-${device.id}`">{{ t('terminalAdmin.device.label') }}</label>
                <div class="input-group mb-2">
                  <input
                    :id="`label-${device.id}`"
                    v-model="editedLabels[device.id]"
                    class="form-control"
                    :readonly="!canAdministerTerminals"
                  />
                  <button
                    v-if="canAdministerTerminals"
                    class="btn btn-outline-primary"
                    type="button"
                    @click="updateLabel(device)"
                  >
                    {{ t('terminalAdmin.device.rename') }}
                  </button>
                </div>
                <p class="muted mb-0">
                  {{ tp('terminalAdmin.device.summary', device.pendingInvitationCount, { building: device.building.label, lastSeen: formatDate(device.lastSeenAt) }) }}
                </p>
              </div>
              <div v-if="canAdministerTerminals" class="d-flex flex-column gap-2">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  type="button"
                  @click="regenerate(device)"
                >
                  {{ t('terminalAdmin.device.regenerate') }}
                </button>
                <button
                  class="btn btn-sm btn-outline-warning"
                  type="button"
                  @click="updateStatus(device, 'paused')"
                >
                  {{ t('terminalAdmin.device.pause') }}
                </button>
                <button class="btn btn-sm btn-outline-danger" type="button" @click="revoke(device)">
                  {{ t('terminalAdmin.device.revoke') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        class="mt-4"
        :title="t('terminalAdmin.inactive.title')"
        :eyebrow="t('terminalAdmin.inactive.eyebrow')"
        :badge="tp('common.inactive', inactiveDevices.length)"
        :default-open="false"
        body-class="compact"
      >
        <div class="table-card table-card-scroll">
          <table class="table align-middle">
            <thead class="table-light">
              <tr>
                <th>{{ t('terminalAdmin.table.terminal') }}</th>
                <th>{{ t('terminalAdmin.create.building') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('terminalAdmin.table.pending') }}</th>
                <th>{{ t('terminalAdmin.table.lastActivity') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="device in inactiveDevices" :key="device.id">
                <td>
                  <strong>{{ device.label }}</strong
                  ><br /><span class="small muted">{{ device.code }}</span>
                </td>
                <td>{{ device.building.label }}</td>
                <td>
                  <span class="badge-soft" :class="statusTone(device.status)">{{
                    statusLabel(device.status)
                  }}</span>
                </td>
                <td>{{ device.pendingInvitationCount }}</td>
                <td>{{ formatDate(device.lastSeenAt) }}</td>
                <td class="text-end">
                  <button
                    v-if="canAdministerTerminals && device.status === 'paused'"
                    class="btn btn-sm btn-outline-success me-2"
                    type="button"
                    @click="updateStatus(device, 'active')"
                  >
                    {{ t('common.enable') }}
                  </button>
                  <button
                    v-if="canAdministerTerminals"
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    @click="regenerate(device)"
                  >
                    {{ t('terminalAdmin.device.newLink') }}
                  </button>
                </td>
              </tr>
              <tr v-if="!inactiveDevices.length">
                <td colspan="6" class="text-center muted py-4">
                  {{ t('terminalAdmin.inactive.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small muted mt-3 mb-0">
          {{ t('terminalAdmin.inactive.help') }}
        </p>
      </CollapsibleSection>
    </div>
  </section>
</template>
