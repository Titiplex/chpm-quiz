import { type UserRole } from '@shared/types/rbac'

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'CHPM Survey',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  defaultRole: 'respondent' as UserRole,
}
