import { randomBytes, createHash } from 'node:crypto'

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')
import type { CookieOptions, Request, Response } from 'express'

import { PrismaService } from '../prisma/prisma.service'
import { roleProfiles } from './role-permissions'
import type {
  AuthBuilding,
  AuthenticatedSession,
  AuthenticatedUser,
  AuthSessionRecord,
  AuthUserRecord,
} from './auth.types'
import type { Permission, UserRole } from './role-permissions'

export interface PublicUserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  permissions: Permission[]
  mustChangePassword: boolean
  building: Pick<AuthBuilding, 'id' | 'code' | 'label' | 'city' | 'country' | 'timezone'> | null
}

@Injectable()
export class AuthService {
  readonly cookieName: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.cookieName = this.config.get<string>('SESSION_COOKIE_NAME', 'chpm_session')
  }

  async login(
    email: string,
    password: string,
    request: Request,
    response: Response,
  ): Promise<PublicUserProfile> {
    if (this.config.get<string>('AUTH_PROVIDER', 'local') !== 'local') {
      throw new UnauthorizedException('Local password authentication is disabled')
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = (await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { building: true },
    })) as AuthUserRecord | null

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Identifiants invalides')
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      const failedLoginCount = (user.failedLoginCount ?? 0) + 1
      const maxAttempts = this.numberConfig('AUTH_LOGIN_MAX_ATTEMPTS', 5, 3, 20)
      const lockMinutes = this.numberConfig('AUTH_LOGIN_LOCK_MINUTES', 15, 1, 1_440)
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil: failedLoginCount >= maxAttempts
            ? new Date(Date.now() + lockMinutes * 60_000)
            : null,
        },
      })
      throw new UnauthorizedException('Identifiants invalides')
    }

    if (user.failedLoginCount || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    }

    return this.establishSession(user, request, response)
  }

  async loginExternal(email: string, request: Request, response: Response): Promise<PublicUserProfile> {
    const user = (await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { building: true },
    })) as AuthUserRecord | null
    if (!user || !user.isActive) throw new UnauthorizedException('The OIDC account is not authorized for this application')

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, mustChangePassword: false },
      include: { building: true },
    }) as AuthUserRecord
    await this.prisma.auditLog.create({
      data: {
        actorUserId: updated.id,
        organizationId: updated.organizationId,
        action: 'auth.oidc.login',
        entityType: 'User',
        entityId: updated.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    })
    return this.establishSession(updated, request, response)
  }

  async validateSessionToken(rawToken: string): Promise<AuthenticatedSession | null> {
    const tokenHash = this.hashToken(rawToken)
    const session = (await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { building: true },
        },
      },
    })) as (AuthSessionRecord & { user: AuthUserRecord }) | null

    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      }

      return null
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })

    const { passwordHash: _passwordHash, ...user } = session.user

    return {
      ...session,
      user,
    }
  }

  async logout(sessionId: string, response: Response): Promise<void> {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined)
    response.clearCookie(this.cookieName, this.cookieOptions())
  }

  async changePassword(
    user: AuthenticatedUser,
    sessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<PublicUserProfile> {
    const record = (await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { building: true },
    })) as AuthUserRecord | null

    if (!record || !record.isActive || !(await bcrypt.compare(currentPassword, record.passwordHash))) {
      throw new UnauthorizedException('Mot de passe actuel invalide')
    }
    const passwordError = this.validatePassword(newPassword)
    if (passwordError) throw new BadRequestException(passwordError)
    if (await bcrypt.compare(newPassword, record.passwordHash)) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent du mot de passe actuel')
    }

    const rounds = this.numberConfig('PASSWORD_BCRYPT_ROUNDS', 12, 12, 14)
    const passwordHash = await bcrypt.hash(newPassword, rounds)
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const saved = await tx.user.update({
        where: { id: record.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        include: { building: true },
      })
      await tx.session.deleteMany({ where: { userId: record.id, id: { not: sessionId } } })
      await tx.auditLog.create({
        data: {
          actorUserId: record.id,
          organizationId: record.organizationId,
          action: 'auth.password.change',
          entityType: 'User',
          entityId: record.id,
          metadata: { otherSessionsRevoked: true },
        },
      })
      return saved
    })
    return this.toPublicProfile(updated)
  }

  toPublicProfile(
    user: AuthenticatedUser | AuthUserRecord,
  ): PublicUserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: roleProfiles[user.role]?.permissions ?? [],
      mustChangePassword: user.mustChangePassword ?? false,
      building: user.building
        ? {
            id: user.building.id,
            code: user.building.code,
            label: user.building.label,
            city: user.building.city,
            country: user.building.country,
            timezone: user.building.timezone,
          }
        : null,
    }
  }

  private cookieOptions(): CookieOptions {
    const sameSite = (this.config.get<string>('COOKIE_SAMESITE', 'lax') ?? 'lax').toLowerCase()

    return {
      httpOnly: true,
      sameSite: sameSite === 'strict' ? 'strict' : sameSite === 'none' ? 'none' : 'lax',
      secure: this.config.get<boolean>('COOKIE_SECURE', false) === true || this.config.get<string>('COOKIE_SECURE') === 'true',
      path: '/',
    }
  }

  private async establishSession(user: AuthUserRecord, request: Request, response: Response): Promise<PublicUserProfile> {
    const rawToken = randomBytes(48).toString('base64url')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + this.sessionTtlMs())
    await this.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: request.get('user-agent'),
        ipAddress: request.ip,
      },
    })
    response.cookie(this.cookieName, rawToken, { ...this.cookieOptions(), maxAge: this.sessionTtlMs() })
    return this.toPublicProfile(user)
  }

  private sessionTtlMs(): number {
    const hours = Number(this.config.get<string>('SESSION_TTL_HOURS', '12'))
    return Math.max(1, hours) * 60 * 60 * 1000
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }

  private numberConfig(key: string, fallback: number, min: number, max: number): number {
    const parsed = Number(this.config.get<string>(key, String(fallback)))
    return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), min), max) : fallback
  }

  private validatePassword(password: string): string | null {
    if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.'
    if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule.'
    if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.'
    if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.'
    if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.'
    return null
  }
}
