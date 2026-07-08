<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSiteTeamStore } from '@/stores/siteTeam'
import type { ApiSiteTeamUser } from '@shared/types/api'

const catalog = useCatalogStore()
const siteTeam = useSiteTeamStore()

const form = reactive({
  email: 'nouveau.moderateur@chpm.local',
  displayName: 'Nouveau modérateur',
  buildingId: '',
})

onMounted(async () => {
  if (!catalog.buildings.length) {
    await catalog.fetchCatalog()
  }
  form.buildingId = form.buildingId || catalog.buildings[0]?.id || ''
  await siteTeam.fetchTeam()
})

const moderators = computed(() => siteTeam.users.filter((user) => user.role === 'moderator'))
const activeCount = computed(() => moderators.value.filter((user) => user.isActive).length)

async function createModerator(): Promise<void> {
  await siteTeam.createModerator({
    email: form.email,
    displayName: form.displayName,
    buildingId: form.buildingId,
  })
}

async function updateBuilding(user: ApiSiteTeamUser, event: Event): Promise<void> {
  const buildingId = (event.target as HTMLSelectElement).value
  if (!buildingId || buildingId === user.buildingId) return
  await siteTeam.updateModerator(user.id, { buildingId })
}

async function toggleActive(user: ApiSiteTeamUser): Promise<void> {
  await siteTeam.updateModerator(user.id, { isActive: !user.isActive })
}

async function resetPassword(user: ApiSiteTeamUser): Promise<void> {
  await siteTeam.resetModeratorPassword(user.id)
}

async function revokeSessions(user: ApiSiteTeamUser): Promise<void> {
  await siteTeam.revokeModeratorSessions(user.id)
}
</script>

<template>
  <CollapsibleSection
    id="moderation-site-team"
    title="Équipe du site"
    :badge="`${activeCount} modérateur(s) actif(s)`"
    :default-open="false"
    body-class="compact"
  >
    <div class="row g-4">
      <div class="col-lg-4">
        <div class="surface-card p-3 h-100">
          <p class="section-eyebrow mb-1">Délégation locale</p>
          <h3 class="h5 mb-2">Ajouter un modérateur</h3>
          <p class="small mb-3" style="color: var(--chm-muted);">
            Le responsable de site peut uniquement créer des modérateurs sur les bâtiments de son propre site. Le mot de passe temporaire est affiché une seule fois.
          </p>
          <form @submit.prevent="createModerator">
            <label class="form-label fw-semibold" for="site-team-display-name">Nom affiché</label>
            <input id="site-team-display-name" v-model="form.displayName" class="form-control mb-3" required />

            <label class="form-label fw-semibold" for="site-team-email">Email interne</label>
            <input id="site-team-email" v-model="form.email" class="form-control mb-3" type="email" required />

            <label class="form-label fw-semibold" for="site-team-building">Bâtiment</label>
            <select id="site-team-building" v-model="form.buildingId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un bâtiment</option>
              <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
                {{ building.label }} · {{ building.code }}
              </option>
            </select>

            <button class="btn btn-primary w-100" type="submit" :disabled="siteTeam.status === 'saving' || !form.buildingId">
              {{ siteTeam.status === 'saving' ? 'Création…' : 'Créer / réactiver' }}
            </button>
          </form>
        </div>
      </div>

      <div class="col-lg-8">
        <div v-if="siteTeam.error" class="alert alert-danger rounded-3" role="alert">{{ siteTeam.error }}</div>
        <div v-if="siteTeam.lastTemporaryPassword && siteTeam.lastTemporaryPasswordUser" class="alert alert-warning rounded-3" role="status">
          <strong>Mot de passe temporaire pour {{ siteTeam.lastTemporaryPasswordUser.displayName }} :</strong>
          <code class="d-block text-break mt-1">{{ siteTeam.lastTemporaryPassword }}</code>
          <button class="btn btn-sm btn-outline-dark mt-2" type="button" @click="siteTeam.clearTemporaryPassword()">
            J’ai copié le mot de passe
          </button>
        </div>

        <div v-if="siteTeam.lastRevokedSessionCount !== null" class="alert alert-info rounded-3" role="status">
          Sessions révoquées : {{ siteTeam.lastRevokedSessionCount }}.
          <button class="btn btn-sm btn-outline-dark ms-2" type="button" @click="siteTeam.clearRevocationNotice()">OK</button>
        </div>

        <div class="table-card table-card-scroll">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Rôle</th>
                <th>Bâtiment</th>
                <th>Statut</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in siteTeam.users" :key="user.id">
                <td>
                  <strong>{{ user.displayName }}</strong><br />
                  <span class="small" style="color: var(--chm-muted);">{{ user.email }}</span>
                </td>
                <td><span class="badge-soft">{{ user.roleLabel }}</span></td>
                <td>
                  <select
                    v-if="user.role === 'moderator'"
                    class="form-select form-select-sm"
                    :value="user.buildingId ?? ''"
                    :disabled="siteTeam.status === 'saving'"
                    @change="updateBuilding(user, $event)"
                  >
                    <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
                      {{ building.label }}
                    </option>
                  </select>
                  <span v-else class="small" style="color: var(--chm-muted);">{{ user.site?.name ?? 'Site affecté' }}</span>
                </td>
                <td>
                  <span class="badge-soft" :class="user.isActive ? 'success' : 'danger'">
                    {{ user.isActive ? 'Actif' : 'Désactivé' }}
                  </span>
                </td>
                <td class="text-end">
                  <div v-if="user.role === 'moderator'" class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" type="button" :disabled="siteTeam.status === 'saving'" @click="toggleActive(user)">
                      {{ user.isActive ? 'Désactiver' : 'Réactiver' }}
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="siteTeam.status === 'saving'" @click="resetPassword(user)">
                      Reset MDP
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="siteTeam.status === 'saving'" @click="revokeSessions(user)">
                      Révoquer sessions
                    </button>
                  </div>
                  <span v-else class="small" style="color: var(--chm-muted);">Pilotage site</span>
                </td>
              </tr>
              <tr v-if="siteTeam.status === 'loading'">
                <td colspan="5" class="text-center py-4" style="color: var(--chm-muted);">Chargement de l’équipe…</td>
              </tr>
              <tr v-else-if="!siteTeam.users.length">
                <td colspan="5" class="text-center py-4" style="color: var(--chm-muted);">Aucun compte dans ce périmètre.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </CollapsibleSection>
</template>
