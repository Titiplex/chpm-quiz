<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { appConfig } from '@/config/env'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { useTerminalAdminStore } from '@/stores/terminalAdmin'
import type { ApiTerminalDevice } from '@shared/types/api'
import type { TerminalDeviceStatus } from '@shared/types/domain'

const catalog = useCatalogStore()
const session = useSessionStore()
const terminalAdmin = useTerminalAdminStore()
const copiedLink = ref(false)
const editedLabels = reactive<Record<string, string>>({})

const form = reactive({
  buildingId: '',
  label: 'Tablette accueil Montréal A',
})

const activeDevices = computed(() => terminalAdmin.terminalDevices.filter((device) => device.status === 'active'))
const inactiveDevices = computed(() => terminalAdmin.terminalDevices.filter((device) => device.status !== 'active'))
const canAdministerTerminals = computed(() => session.hasPermission('terminal:administer'))

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

async function updateStatus(device: ApiTerminalDevice, status: TerminalDeviceStatus): Promise<void> {
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

function statusLabel(status: TerminalDeviceStatus): string {
  const labels: Record<TerminalDeviceStatus, string> = {
    active: 'Actif',
    paused: 'Suspendu',
    revoked: 'Révoqué',
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
  return value ? new Date(value).toLocaleString('fr-FR') : 'Jamais'
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Terminaux par périmètre"
        title="Gérer les terminaux hospitaliers de réponse"
        :description="appConfig.demoMode ? 'La démo simule la création, la suspension, la révocation et la régénération des liens terminaux.' : 'Les terminaux sont enregistrés par bâtiment, disposent d’un jeton secret non récupérable et ne donnent accès qu’à leur file d’attente répondant.'"
        badge="Terminaux par bâtiment"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="terminalAdmin.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ terminalAdmin.error }}
      </div>
      <div v-else class="alert alert-info rounded-4" role="status">
        Un terminal n’est pas un compte staff. Il s’agit d’un appareil appairé à un bâtiment, utilisable uniquement pour ouvrir les questionnaires qui lui sont explicitement affectés. Les modérateurs consultent leur inventaire ; les gestionnaires de site et administrateurs peuvent administrer les terminaux dans leur périmètre.
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3"><KpiCard label="Terminaux" :value="String(terminalAdmin.totals.total)" /></div>
        <div class="col-md-3"><KpiCard label="Actifs" :value="String(terminalAdmin.totals.active)" tone="success" /></div>
        <div class="col-md-3"><KpiCard label="Suspendus" :value="String(terminalAdmin.totals.paused)" tone="warning" /></div>
        <div class="col-md-3"><KpiCard label="En attente" :value="String(terminalAdmin.totals.pendingInvitations)" /></div>
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <form v-if="canAdministerTerminals" class="demo-card h-100" @submit.prevent="createTerminal">
            <p class="section-eyebrow mb-2">Appairage</p>
            <h2 class="h4 fw-bold mb-3">Créer un terminal hospitalier</h2>

            <label class="form-label fw-bold" for="terminal-building">Bâtiment</label>
            <select id="terminal-building" v-model="form.buildingId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un bâtiment</option>
              <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
                {{ building.label }} · {{ building.city }}
              </option>
            </select>

            <label class="form-label fw-bold" for="terminal-label">Nom visible de l’appareil</label>
            <input id="terminal-label" v-model="form.label" class="form-control mb-3" required minlength="2" maxlength="120" />
            <p class="small muted mb-4">
              Exemple : “Tablette accueil Montréal A”, “Borne salle d’attente Paris C” ou “PC kiosque unité H”.
            </p>

            <button class="btn btn-primary w-100 btn-lg" type="submit" :disabled="terminalAdmin.status === 'saving' || !form.buildingId">
              {{ terminalAdmin.status === 'saving' ? 'Création…' : 'Créer et générer le lien terminal' }}
            </button>

            <div v-if="terminalAdmin.lastLaunchLink" class="alert alert-success rounded-4 mt-3 mb-0">
              <strong>Lien terminal généré.</strong>
              <p class="small muted mt-1 mb-2">
                Ouvre ce lien une seule fois sur l’appareil hospitalier cible, puis mets le navigateur en plein écran ou en mode kiosque.
              </p>
              <a class="d-block text-break" :href="terminalAdmin.lastLaunchLink" target="_blank" rel="noreferrer">
                {{ terminalAdmin.lastLaunchLink }}
              </a>
              <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLastLaunchLink">
                {{ copiedLink ? 'Lien copié' : 'Copier le lien terminal' }}
              </button>
            </div>
          </form>
          <div v-else class="demo-card h-100">
            <p class="section-eyebrow mb-2">Consultation</p>
            <h2 class="h4 fw-bold mb-3">Inventaire des terminaux autorisés</h2>
            <p class="muted mb-0">
              Ce rôle peut voir les terminaux de son périmètre et les invitations en attente, mais ne peut pas créer, suspendre, révoquer ou régénérer un lien terminal.
            </p>
          </div>
        </div>

        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Exploitation</p>
                <h2 class="h4 fw-bold mb-0">Terminaux actifs</h2>
              </div>
              <button class="btn btn-outline-primary" type="button" @click="terminalAdmin.fetchTerminalDevices">Actualiser</button>
            </div>

            <div v-if="!activeDevices.length" class="alert alert-light border rounded-4">
              Aucun terminal actif. Crée un terminal puis ouvre son lien sur l’appareil hospitalier cible.
            </div>

            <div v-for="device in activeDevices" :key="device.id" class="border rounded-4 p-3 mb-3">
              <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                    <span class="badge-soft" :class="statusTone(device.status)">{{ statusLabel(device.status) }}</span>
                    <span class="small muted">{{ device.code }}</span>
                  </div>
                  <label class="form-label fw-bold small" :for="`label-${device.id}`">Libellé</label>
                  <div class="input-group mb-2">
                    <input :id="`label-${device.id}`" v-model="editedLabels[device.id]" class="form-control" :readonly="!canAdministerTerminals" />
                    <button v-if="canAdministerTerminals" class="btn btn-outline-primary" type="button" @click="updateLabel(device)">Renommer</button>
                  </div>
                  <p class="muted mb-0">
                    {{ device.building.label }} · {{ device.pendingInvitationCount }} invitation(s) en attente · dernière activité : {{ formatDate(device.lastSeenAt) }}
                  </p>
                </div>
                <div v-if="canAdministerTerminals" class="d-flex flex-column gap-2">
                  <button class="btn btn-sm btn-outline-secondary" type="button" @click="regenerate(device)">Régénérer le lien</button>
                  <button class="btn btn-sm btn-outline-warning" type="button" @click="updateStatus(device, 'paused')">Suspendre</button>
                  <button class="btn btn-sm btn-outline-danger" type="button" @click="revoke(device)">Révoquer</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-card mt-4">
        <p class="section-eyebrow mb-2">Inventaire complet</p>
        <h2 class="h4 fw-bold mb-3">Terminaux suspendus ou révoqués</h2>
        <div class="table-card">
          <table class="table align-middle">
            <thead class="table-light">
              <tr>
                <th>Terminal</th>
                <th>Bâtiment</th>
                <th>Statut</th>
                <th>En attente</th>
                <th>Dernière activité</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="device in inactiveDevices" :key="device.id">
                <td><strong>{{ device.label }}</strong><br /><span class="small muted">{{ device.code }}</span></td>
                <td>{{ device.building.label }}</td>
                <td><span class="badge-soft" :class="statusTone(device.status)">{{ statusLabel(device.status) }}</span></td>
                <td>{{ device.pendingInvitationCount }}</td>
                <td>{{ formatDate(device.lastSeenAt) }}</td>
                <td class="text-end">
                  <button v-if="canAdministerTerminals && device.status === 'paused'" class="btn btn-sm btn-outline-success me-2" type="button" @click="updateStatus(device, 'active')">Réactiver</button>
                  <button v-if="canAdministerTerminals" class="btn btn-sm btn-outline-primary" type="button" @click="regenerate(device)">Nouveau lien</button>
                </td>
              </tr>
              <tr v-if="!inactiveDevices.length">
                <td colspan="6" class="text-center muted py-4">Aucun terminal suspendu ou révoqué.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="small muted mt-3 mb-0">
          Le lien terminal n’est pas stocké en clair. S’il est perdu ou exposé, il faut régénérer un nouveau lien et rouvrir la page sur l’appareil cible.
        </p>
      </div>
    </div>
  </section>
</template>
