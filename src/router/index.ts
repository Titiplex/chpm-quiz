import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminBuilderView.vue'),
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('../views/ModeratorView.vue'),
    },
    {
      path: '/questionnaire',
      name: 'questionnaire',
      component: () => import('../views/RespondentView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      path: '/architecture',
      name: 'architecture',
      component: () => import('../views/ArchitectureView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
