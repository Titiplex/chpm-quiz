import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { AuthService } from './auth.service'

const building = {
  id: 'building-1',
  code: 'B1',
  label: 'Bâtiment 1',
  city: 'Montfavet',
  country: 'FR',
  timezone: 'Europe/Paris',
}

const activeUser = {
  id: 'user-1',
  email: 'admin@example.test',
  displayName: 'Admin',
  role: 'admin',
  isActive: true,
  passwordHash: bcrypt.hashSync('secret', 4),
  building,
}

function makeService(overrides: Record<string, unknown> = {}, configOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: { findUnique: vi.fn(async () => activeUser), update: vi.fn(async (args: any) => ({ ...activeUser, ...args.data })) },
    session: {
      create: vi.fn(async (args: unknown) => args),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async (args: unknown) => args),
      delete: vi.fn(async () => undefined),
    },
    ...overrides,
  }
  const config = {
    get: vi.fn(<T = string>(key: string, fallback?: T) => (key in configOverrides ? configOverrides[key] as T : fallback)),
  }
  const service = new AuthService(prisma as any, config as any)
  return { service, prisma, config }
}

const request = { get: vi.fn(() => 'Vitest'), ip: '127.0.0.1' } as any
const response = { cookie: vi.fn(), clearCookie: vi.fn() } as any

describe('AuthService', () => {
  it('logs in active users, stores a hashed session and sets a secure cookie', async () => {
    const { service, prisma } = makeService({}, {
      SESSION_COOKIE_NAME: 'sid',
      SESSION_TTL_HOURS: '2',
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'strict',
    })

    const profile = await service.login(' ADMIN@example.test ', 'secret', request, response)

    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'admin@example.test' } }))
    expect(prisma.session.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: activeUser.id, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }) })
    expect(response.cookie).toHaveBeenCalledWith('sid', expect.any(String), expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7_200_000 }))
    expect(profile).toMatchObject({ id: activeUser.id, role: 'admin', building: { code: 'B1' } })
    expect(profile).not.toHaveProperty('passwordHash')
  })

  it('rejects missing, inactive and bad-password users', async () => {
    await expect(makeService({ user: { findUnique: vi.fn(async () => null) } }).service.login('x@test', 'secret', request, response)).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(makeService({ user: { findUnique: vi.fn(async () => ({ ...activeUser, isActive: false })) } }).service.login('x@test', 'secret', request, response)).rejects.toBeInstanceOf(UnauthorizedException)
    await expect(makeService().service.login('x@test', 'wrong', request, response)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('validates a live session, refreshes lastSeenAt and removes private user fields', async () => {
    const future = new Date(Date.now() + 60_000)
    const session = { id: 'session-1', tokenHash: 'hash', expiresAt: future, user: activeUser }
    const { service, prisma } = makeService({ session: { findUnique: vi.fn(async () => session), update: vi.fn(async () => undefined), delete: vi.fn() } })

    const result = await service.validateSessionToken('raw-token')

    expect(prisma.session.update).toHaveBeenCalledWith({ where: { id: 'session-1' }, data: { lastSeenAt: expect.any(Date) } })
    expect(result).toMatchObject({ id: 'session-1', user: { id: activeUser.id, role: activeUser.role } })
    expect(result?.user).not.toHaveProperty('passwordHash')
  })

  it('invalidates expired sessions and inactive users', async () => {
    const expiredSession = { id: 'session-1', tokenHash: 'hash', expiresAt: new Date(Date.now() - 1), user: activeUser }
    const inactiveSession = { ...expiredSession, expiresAt: new Date(Date.now() + 60_000), user: { ...activeUser, isActive: false } }

    const expired = makeService({ session: { findUnique: vi.fn(async () => expiredSession), delete: vi.fn(async () => undefined), update: vi.fn() } })
    await expect(expired.service.validateSessionToken('raw')).resolves.toBeNull()
    expect(expired.prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } })

    const inactive = makeService({ session: { findUnique: vi.fn(async () => inactiveSession), delete: vi.fn(async () => undefined), update: vi.fn() } })
    await expect(inactive.service.validateSessionToken('raw')).resolves.toBeNull()
  })

  it('logs out defensively and clears the configured cookie', async () => {
    const { service, prisma } = makeService({ session: { delete: vi.fn(async () => undefined) } }, { SESSION_COOKIE_NAME: 'sid', COOKIE_SAMESITE: 'none' })

    await service.logout('session-1', response)

    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } })
    expect(response.clearCookie).toHaveBeenCalledWith('sid', expect.objectContaining({ httpOnly: true, sameSite: 'none' }))
  })
})
