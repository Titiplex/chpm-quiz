<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { defaultPathByRole } from '@/config/navigation'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' })
const localError = ref<string | null>(null)
const saving = ref(false)

async function submit(): Promise<void> {
  localError.value = null
  if (form.newPassword !== form.confirmation) {
    localError.value = 'The password confirmation does not match.'
    return
  }
  saving.value = true
  try {
    await session.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    await router.replace(defaultPathByRole[session.currentRole])
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'The password could not be changed.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="demo-page login-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6 col-xl-4">
          <div class="demo-card">
            <p class="section-eyebrow mb-2">Account security</p>
            <h1 class="page-header-title mb-3">Change your password</h1>
            <p class="mb-4">A temporary password cannot be used as a permanent credential.</p>
            <form @submit.prevent="submit">
              <label class="form-label fw-semibold" for="current-password">Current password</label>
              <input id="current-password" v-model="form.currentPassword" class="form-control mb-3" autocomplete="current-password" type="password" required />
              <label class="form-label fw-semibold" for="new-password">New password</label>
              <input id="new-password" v-model="form.newPassword" class="form-control mb-3" autocomplete="new-password" type="password" minlength="12" required />
              <label class="form-label fw-semibold" for="password-confirmation">Confirm the new password</label>
              <input id="password-confirmation" v-model="form.confirmation" class="form-control mb-3" autocomplete="new-password" type="password" minlength="12" required />
              <div v-if="localError" class="alert alert-danger" role="alert">{{ localError }}</div>
              <button class="btn btn-primary w-100" type="submit" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save password' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
