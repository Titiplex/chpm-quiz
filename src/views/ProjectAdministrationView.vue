<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { t, tp } from '@/i18n'
import { useProjectAdministrationStore } from '@/stores/projectAdministration'
import type { ApiSiteAdminUser } from '@shared/types/api'

const administration = useProjectAdministrationStore()

const siteForm = reactive({
  code: 'MTL-NORD',
  name: t('projectAdmin.site.namePlaceholder'),
  country: 'France',
  timezone: 'Europe/Paris',
})

const form = reactive({
  email: 'responsable.site@chpm.local',
  displayName: t('projectAdmin.delegate.displayNamePlaceholder'),
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
        :title="t('projectAdmin.header.title')"
        :description="t('projectAdmin.header.description')"
        :badge="t('projectAdmin.header.badge')"
      />
      <RoleGateInfo />

      <div v-if="administration.error" class="alert alert-danger rounded-3 mb-4" role="alert">
        {{ administration.error }}
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">{{ t('projectAdmin.site.eyebrow') }}</p>
            <h2 class="h5 mb-2">{{ t('projectAdmin.site.title') }}</h2>
            <p class="small mb-3" style="color: var(--chm-muted);">
              {{ t('projectAdmin.site.description') }}
            </p>
            <form @submit.prevent="createSite">
              <label class="form-label fw-semibold" for="site-code">{{ t('projectAdmin.site.code') }}</label>
              <input id="site-code" v-model="siteForm.code" class="form-control mb-3" :placeholder="t('projectAdmin.site.codePlaceholder')" required />

              <label class="form-label fw-semibold" for="site-name">{{ t('projectAdmin.site.name') }}</label>
              <input id="site-name" v-model="siteForm.name" class="form-control mb-3" :placeholder="t('projectAdmin.site.namePlaceholder')" required />

              <label class="form-label fw-semibold" for="site-country">{{ t('projectAdmin.site.country') }}</label>
              <input id="site-country" v-model="siteForm.country" class="form-control mb-3" :placeholder="t('projectAdmin.site.countryPlaceholder')" />

              <label class="form-label fw-semibold" for="site-timezone">{{ t('projectAdmin.site.timezone') }}</label>
              <input id="site-timezone" v-model="siteForm.timezone" class="form-control mb-3" :placeholder="t('projectAdmin.site.timezonePlaceholder')" />

              <button class="btn btn-outline-primary w-100" type="submit" :disabled="administration.status === 'saving'">
                {{ administration.status === 'saving' ? t('projectAdmin.site.creating') : t('projectAdmin.site.add') }}
              </button>
            </form>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">{{ t('projectAdmin.delegate.eyebrow') }}</p>
            <h2 class="h5 mb-2">{{ t('projectAdmin.delegate.title') }}</h2>
            <p class="small mb-3" style="color: var(--chm-muted);">
              {{ t('projectAdmin.delegate.description') }}
            </p>
            <form @submit.prevent="createSiteAdmin">
              <label class="form-label fw-semibold" for="site-admin-display-name">{{ t('projectAdmin.delegate.displayName') }}</label>
              <input id="site-admin-display-name" v-model="form.displayName" class="form-control mb-3" required />

              <label class="form-label fw-semibold" for="site-admin-email">{{ t('projectAdmin.delegate.email') }}</label>
              <input id="site-admin-email" v-model="form.email" class="form-control mb-3" type="email" required />

              <label class="form-label fw-semibold" for="site-admin-site">{{ t('projectAdmin.delegate.site') }}</label>
              <select id="site-admin-site" v-model="form.siteId" class="form-select mb-3" required>
                <option value="" disabled>{{ t('projectAdmin.delegate.chooseSite') }}</option>
                <option v-for="site in administration.sites" :key="site.id" :value="site.id">
                  {{ site.name }} · {{ site.code }}
                </option>
              </select>

              <button class="btn btn-primary w-100" type="submit" :disabled="administration.status === 'saving' || !form.siteId">
                {{ administration.status === 'saving' ? t('projectAdmin.site.creating') : t('projectAdmin.delegate.create') }}
              </button>
            </form>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="surface-card p-3 h-100">
            <p class="section-eyebrow mb-1">{{ t('projectAdmin.authority.eyebrow') }}</p>
            <h2 class="h5 mb-2">{{ t('projectAdmin.authority.title') }}</h2>
            <p class="mb-2" style="color: var(--chm-muted);">
              {{ t('projectAdmin.authority.chain') }}
            </p>
            <p class="mb-0" style="color: var(--chm-muted);">
              {{ t('projectAdmin.authority.dpo') }}
            </p>
          </div>
        </div>
      </div>

      <CollapsibleSection
        id="project-sites"
        :title="t('projectAdmin.sites.title')"
        :badge="tp('projectAdmin.sites.count', siteCount)"
        :default-open="true"
        body-class="compact"
      >
        <div class="table-card table-card-scroll">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>{{ t('projectAdmin.delegate.site') }}</th>
                <th>{{ t('projectAdmin.sites.organization') }}</th>
                <th>{{ t('projectAdmin.site.country') }}</th>
                <th>{{ t('projectAdmin.site.timezone') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="site in administration.sites" :key="site.id">
                <td>
                  <strong>{{ site.name }}</strong><br />
                  <span class="small" style="color: var(--chm-muted); font-family: monospace;">{{ site.code }}</span>
                </td>
                <td class="small">{{ site.organization?.name ?? t('projectAdmin.sites.projectOrganization') }}</td>
                <td class="small">{{ site.country ?? '—' }}</td>
                <td class="small">{{ site.timezone ?? '—' }}</td>
              </tr>
              <tr v-if="administration.status === 'loading'">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">{{ t('projectAdmin.sites.loading') }}</td>
              </tr>
              <tr v-else-if="!administration.sites.length">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">{{ t('projectAdmin.sites.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="project-site-admins"
        :title="t('projectAdmin.managers.title')"
        :badge="tp('common.active', activeCount)"
        :default-open="true"
        body-class="compact"
      >
        <div v-if="administration.lastTemporaryPassword && administration.lastTemporaryPasswordUser" class="alert alert-warning rounded-3" role="status">
          <strong>{{ t('common.temporaryPasswordFor', { name: administration.lastTemporaryPasswordUser.displayName }) }}</strong>
          <code class="d-block text-break mt-1">{{ administration.lastTemporaryPassword }}</code>
          <button class="btn btn-sm btn-outline-dark mt-2" type="button" @click="administration.clearTemporaryPassword()">
            {{ t('common.passwordCopied') }}
          </button>
        </div>

        <div v-if="administration.lastRevokedSessionCount !== null" class="alert alert-info rounded-3" role="status">
          {{ t('common.revokedSessions', { count: administration.lastRevokedSessionCount }) }}
          <button class="btn btn-sm btn-outline-dark ms-2" type="button" @click="administration.clearRevocationNotice()">{{ t('common.dismiss') }}</button>
        </div>

        <div class="table-card table-card-scroll table-card-scroll-lg">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>{{ t('projectAdmin.table.account') }}</th>
                <th>{{ t('projectAdmin.delegate.site') }}</th>
                <th>{{ t('common.status') }}</th>
                <th class="text-end">{{ t('common.actions') }}</th>
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
                    {{ user.isActive ? t('common.active') : t('common.disabled') }}
                  </span>
                </td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" type="button" :disabled="administration.status === 'saving'" @click="toggleActive(user)">
                      {{ user.isActive ? t('common.disable') : t('common.enable') }}
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="administration.status === 'saving'" @click="resetPassword(user)">
                      {{ t('common.resetPassword') }}
                    </button>
                    <button class="btn btn-outline-secondary" type="button" :disabled="administration.status === 'saving'" @click="revokeSessions(user)">
                      {{ t('common.revokeSessions') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="administration.status === 'loading'">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">{{ t('projectAdmin.managers.loading') }}</td>
              </tr>
              <tr v-else-if="!administration.siteAdmins.length">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">{{ t('projectAdmin.managers.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  </section>
</template>
