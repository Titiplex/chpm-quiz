import type { UserRole } from './role-permissions'

export interface AuthBuilding {
  id: string
  code: string
  label: string
  city: string
  country: string
  timezone: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthUserRecord {
  id: string
  email: string
  passwordHash: string
  displayName: string
  role: UserRole
  isActive: boolean
  buildingId: string | null
  building: AuthBuilding | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthSessionRecord {
  id: string
  tokenHash: string
  userId: string
  expiresAt: Date
  createdAt: Date
  lastSeenAt: Date
  userAgent: string | null
  ipAddress: string | null
}

export type AuthenticatedUser = Omit<AuthUserRecord, 'passwordHash'>

export type AuthenticatedSession = AuthSessionRecord & {
  user: AuthenticatedUser
}
