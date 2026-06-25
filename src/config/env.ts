import { type UserRole } from '@shared/types/rbac'

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'CHPM Survey',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  staticPagesDemo: import.meta.env.VITE_STATIC_PAGES_DEMO === 'true',
  defaultRole: (import.meta.env.VITE_DEMO_DEFAULT_ROLE || 'moderator') as UserRole,
}
