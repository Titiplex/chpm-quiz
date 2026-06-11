import { hasRoleAccess, roleProfiles, type Permission, type UserRole } from '../../../shared/types/rbac'

export function canAccessRoute(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return hasRoleAccess(role, allowedRoles)
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return roleProfiles[role].permissions.includes(permission)
}
