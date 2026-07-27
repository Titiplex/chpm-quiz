<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import { formatDate, t } from '@/i18n'
import { useTerminalStore } from '@/stores/terminal'
import type { ApiInvitation } from '@shared/types/api'

const route = useRoute()
const router = useRouter()
const terminal = useTerminalStore()

const terminalTokenFromRoute = computed(() => String(route.params.terminalToken ?? ''))

onMounted(async () => {
  await terminal.load(terminalTokenFromRoute.value || null)
})

async function openInvitation(invitation: ApiInvitation): Promise<void> {
  const response = await terminal.openInvitation(invitation.id)
  await router.push({
    name: 'respondent-token',
    params: { token: response.accessToken },
    query: { terminalToken: terminal.terminalToken ?? undefined },
  })
}
</script>

<template>
  <section class="demo-page terminal-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :eyebrow="t('terminal.header.eyebrow')"
        :title="t('terminal.header.title')"
        :description="t('terminal.header.description')"
        :badge="t('terminal.header.badge')"
      />

      <div v-if="terminal.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ terminal.error }}
      </div>

      <div v-else-if="terminal.terminalDevice" class="row g-4">
        <div class="col-xl-4">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">{{ t('terminal.device.eyebrow') }}</p>
            <h2 class="h4 fw-bold mb-2">{{ terminal.terminalDevice.label }}</h2>
            <p class="muted mb-3">{{ terminal.terminalDevice.building.label }} · {{ terminal.terminalDevice.code }}</p>
            <div class="badge-soft success">{{ t('terminal.device.active') }}</div>
            <hr />
            <p class="small muted mb-0">
              {{ t('terminal.device.description') }}
            </p>
          </div>
        </div>

        <div class="col-xl-8">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
              <div>
                <p class="section-eyebrow mb-2">{{ t('terminal.queue.eyebrow') }}</p>
                <h2 class="h4 fw-bold mb-0">{{ t('terminal.queue.title') }}</h2>
              </div>
              <button class="btn btn-outline-primary" type="button" @click="terminal.load()">
                {{ t('common.refresh') }}
              </button>
            </div>

            <div v-if="!terminal.invitations.length" class="alert alert-light border rounded-4">
              {{ t('terminal.queue.empty') }}
            </div>

            <div v-for="invitation in terminal.invitations" :key="invitation.id" class="border rounded-4 p-3 mb-3">
              <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
                <div>
                  <p class="section-eyebrow mb-1">{{ invitation.publicCode }}</p>
                  <h3 class="h5 fw-bold mb-1">{{ invitation.questionnaireTitle }}</h3>
                  <p class="muted mb-2">{{ t('terminal.invitation.versionExpiry', { version: invitation.versionLabel, expiresAt: formatDate(invitation.expiresAt, { dateStyle: 'short', timeStyle: 'short' }) }) }}</p>
                  <span class="badge-soft neutral">{{ invitation.assistanceMode === 'none' ? t('terminal.assistance.none') : t('terminal.assistance.assisted') }}</span>
                </div>
                <button class="btn btn-primary" type="button" :disabled="terminal.status === 'opening'" @click="openInvitation(invitation)">
                  {{ t('terminal.invitation.start') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="demo-card">
        {{ t('terminal.loading') }}
      </div>
    </div>
  </section>
</template>
