import { isUserRole, type UserRole } from '@shared/types/rbac'

const rawDefaultRole = import.meta.env.VITE_DEMO_DEFAULT_ROLE

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'CHPM Survey',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  defaultRole: isUserRole(rawDefaultRole) ? rawDefaultRole : ('admin' satisfies UserRole),
}
