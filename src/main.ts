import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/demo.css'

import App from './App.vue'
import { applyDocumentMetadata } from './config/documentMeta'
import { initializeI18n } from './i18n'
import router from './router'

async function bootstrap(): Promise<void> {
  applyDocumentMetadata()
  router.afterEach(() => applyDocumentMetadata())

  await initializeI18n()

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

void bootstrap()
