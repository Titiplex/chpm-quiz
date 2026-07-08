<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { useProjectAdministrationStore } from '@/stores/projectAdministration'
import type { ApiSiteAdminUser } from '@shared/types/api'

const administration = useProjectAdministrationStore()

const siteForm = reactive({
  code: 'MTL-NORD',
  name: 'Montfavet Nord',
  country: 'France',
  timezone: 'Europe/Paris',
})

const form = reactive({
  email: 'responsable.site@chpm.local',
  displayName: 'Responsable de site',
  siteId: '',
})

onMounted(async () => {
  await administration.fetchAdministration()
  form.siteId = form.siteId || administration.sites[0]?.id || ''
})

const activeCount = computed(() => administration.activeSiteAdmins.length)
const siteCount = computed(() => administration.sites.length)

async function createSite(): Promise<void> {
  const site = await administration.createSite({
    code: siteForm.code,
    name: siteForm.name,
    country: siteForm.country,
    timezone: siteForm.timezone,
  })
  form.siteId = site.id
  siteForm.code = ''
  siteForm.name = ''
}

async function createSiteAdmin(): Promise<void> {
  await administration.createSiteAdmin({
    email: form.email,
    displayName: form.displayName,
    siteId: form.siteId,
  })
}

async function updateSite(user: ApiSiteAdminUser, event: Event): Promise<void> {
  const siteId = (event.target as HTMLSelectElement).value
  if (!siteId || siteId === user.siteId) return
  await administration.updateSiteAdmin(user.id, { siteId })
}

async function toggleActive(user: ApiSiteAdminUser): Promise<void> {
  await administration.updateSiteAdmin(user.id, { isActive: !user.isActive })
}

async function resetPassword(user: ApiSiteAdminUser): Promise<void> {
  await administration.resetSiteAdminPassword(user.id)
}

async function revokeSessions(user: ApiSiteAdminUser): Promise<void> {
  await administration.revokeSiteAdminSessions(user.id)
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        title="Administration projet"
        description="Gestion centrale des responsables de site. Les administrateurs projet / chercheurs ne voient ni emails répondants, ni coffre identité, ni données confidentielles DPO."
        badge="Admin projet"
      />
      <RoleGateInfo />

      <div v-if="administration.error" class="alert alert-danger rounded-3 mb-4" role="alert">
        {{ administration.error }}
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">Périmètre projet</p>
            <h2 class="h5 mb-2">Créer un site</h2>
            <p class="small mb-3" style="color: var(--chm-muted);">
              L’administrateur projet crée d’abord le site, puis y affecte un responsable. Aucun bâtiment ni modérateur n’est créé à ce niveau.
            </p>
            <form @submit.prevent="createSite">
              <label class="form-label fw-semibold" for="site-code">Code site</label>
              <input id="site-code" v-model="siteForm.code" class="form-control mb-3" placeholder="MTL-NORD" required />

              <label class="form-label fw-semibold" for="site-name">Nom du site</label>
              <input id="site-name" v-model="siteForm.name" class="form-control mb-3" placeholder="Montfavet Nord" required />

              <label class="form-label fw-semibold" for="site-country">Pays</label>
              <input id="site-country" v-model="siteForm.country" class="form-control mb-3" placeholder="France" />

              <label class="form-label fw-semibold" for="site-timezone">Fuseau horaire</label>
              <input id="site-timezone" v-model="siteForm.timezone" class="form-control mb-3" placeholder="Europe/Paris" />

              <button class="btn btn-outline-primary w-100" type="submit" :disabled="administration.status === 'saving'">
                {{ administration.status === 'saving' ? 'Création…' : '+ Ajouter le site' }}
              </button>
            </form>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">Délégation projet</p>
            <h2 class="h5 mb-2">Créer un responsable de site</h2>
            <p class="small mb-3" style="color: var(--chm-muted);">
              Cette interface crée uniquement des responsables de site. Elle ne crée ni admin global, ni DPO, ni compte technique.
            </p>
            <form @submit.prevent="createSiteAdmin">
              <label class="form-label fw-semibold" for="site-admin-display-name">Nom affiché</label>
              <input id="site-admin-display-name" v-model="form.displayName" class="form-control mb-3" required />

              <label class="form-label fw-semibold" for="site-admin-email">Email interne</label>
              <input id="site-admin-email" v-model="form.email" class="form-control mb-3" type="email" required />

              <label class="form-label fw-semibold" for="site-admin-site">Site</label>
              <select id="site-admin-site" v-model="form.siteId" class="form-select mb-3" required>
                <option value="" disabled>Choisir un site</option>
                <option v-for="site in administration.sites" :key="site.id" :value="site.id">
                  {{ site.name }} · {{ site.code }}
                </option>
              </select>

              <button class="btn btn-primary w-100" type="submit" :disabled="administration.status === 'saving' || !form.siteId">
                {{ administration.status === 'saving' ? 'Création…' : 'Créer / réactiver' }}
              </button>
            </form>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">Périmètre</p>
            <h2 class="h5 mb-2">Chaîne d’autorité appliquée</h2>
            <p class="mb-2" style="color: var(--chm-muted);">
              Console locale sécurisée → administrateurs projet / chercheurs → responsables de site → modérateurs → répondants.
            </p>
            <p class="mb-0" style="color: var(--chm-muted);">
              Le DPO reste hors frontend métier principal. Les exports code-email passent par la console DPO dédiée et auditée.
            </p>
          </div>
        </div>
      </div>

      <CollapsibleSection
        id="project-sites"
        title="Sites du projet"
        :badge="`${siteCount} site(s)`"
        :default-open="true"
        body-class="compact"
      >
        <div class="table-card table-card-scroll">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Site</th>
                <th>Organisation</th>
                <th>Pays</th>
                <th>Fuseau</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="site in administration.sites" :key="site.id">
                <td>
                  <strong>{{ site.name }}</strong><br />
                  <span class="small" style="color: var(--chm-muted); font-family: monospace;">{{ site.code }}</span>
                </td>
                <td class="small">{{ site.organization?.name ?? 'Organisation projet' }}</td>
                <td class="small">{{ site.country ?? '—' }}</td>
                <td class="small">{{ site.timezone ?? '—' }}</td>
              </tr>
              <tr v-if="administration.status === 'loading'">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">Chargement des sites…</td>
              </tr>
              <tr v-else-if="!administration.sites.length">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">Aucun site créé.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="project-site-admins"
        title="Responsables de site"
        :badge="`${activeCount} actif(s)`"
        :default-open="true"
        body-class="compact"
      >
        <div v-if="administration.lastTemporaryPassword && administration.lastTemporaryPasswordUser" class="alert alert-warning rounded-3" role="status">
          <strong>Mot de passe temporaire pour {{ administration.lastTemporaryPasswordUser.displayName }} :</strong>
          <code class="d-block text-break mt-1">{{ administration.lastTemporaryPassword }}</code>
          <button class="btn btn-sm btn-outline-dark mt-2" type="button" @click="administration.clearTemporaryPassword()">
            J’ai copié le mot de passe
          </button>
        </div>

        <div v-if="administration.lastRevokedSessionCount !== null" class="alert alert-info rounded-3" role="status">
          Sessions révoquées : {{ administration.lastRevokedSessionCount }}.
          <button class="btn btn-sm btn-outline-dark ms-2" type="button" @click="administration.clearRevocationNotice()">OK</button>
        </div>

        <div class="table-card table-card-scroll table-card-scroll-lg">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Site</th>
                <th>Statut</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in administration.siteAdmins" :key="user.id">
                <td>
                  <strong>{{ user.displayName }}</strong><br />
                  <span class="small" style="color: var(--chm-muted);">{{ user.email }}</span>
                </td>
                <td>
                  <select
                    class="form-select form-select-sm"
                    :value="user.siteId ?? ''"
                    :disabled="administration.status === 'saving'"
                    @change="updateSite(user, $event)"
                  >
                    <option v-for="site in administration.sites" :key="site.id" :value="site.id">
                      {{ site.name }}
                    </option>
                  </select>
                </td>
                <td>
                  <span class="badge-soft" :class="user.isActive ? 'success' : 'danger'">
                    {{ user.isActive ? 'Actif' : 'Désactivé' }}
                  </span>
                </td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" type="button" :disabled="administration.status === 'saving'" @click="toggleActive(user)">
                      {{ user.isActive ? 'Désactiver' : 'Réactiver' }}
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="administration.status === 'saving'" @click="resetPassword(user)">
                      Reset MDP
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="administration.status === 'saving'" @click="revokeSessions(user)">
                      Révoquer sessions
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="administration.status === 'loading'">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">Chargement des responsables de site…</td>
              </tr>
              <tr v-else-if="!administration.siteAdmins.length">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">Aucun responsable de site.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  </section>
</template>
