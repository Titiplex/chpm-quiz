import type { Building, Session, User } from '@prisma/client'

export type AuthenticatedUser = Omit<User, 'passwordHash'> & {
  building: Building | null
}

export type AuthenticatedSession = Session & {
  user: AuthenticatedUser
}
