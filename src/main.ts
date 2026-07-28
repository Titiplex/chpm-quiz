import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/demo.css'

import App from './App.vue'
import { applyDocumentMetadata } from './config/documentMeta'
import { i18nState, initializeI18n } from './i18n'
import router from './router'

async function bootstrap(): Promise<void> {
  await initializeI18n()

  applyDocumentMetadata()
  watch(i18nState.activeLocale, () => applyDocumentMetadata())
  router.afterEach(() => applyDocumentMetadata())

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

void bootstrap()
