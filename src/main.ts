import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/demo.css'

import App from './App.vue'
import { initializeI18n } from './i18n'
import router from './router'

async function bootstrap(): Promise<void> {
  await initializeI18n()

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
}

void bootstrap()
