import { randomBytes, createHash } from 'node:crypto'

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'

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
    const normalizedEmail = email.trim().toLowerCase()
    const user = (await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { building: true },
    })) as AuthUserRecord | null

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides')
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides')
    }

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

    response.cookie(this.cookieName, rawToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('COOKIE_SECURE', 'false') === 'true',
      maxAge: this.sessionTtlMs(),
      path: '/',
    })

    return this.toPublicProfile(user)
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
    response.clearCookie(this.cookieName, { path: '/' })
  }

  toPublicProfile(
    user: AuthenticatedUser | AuthUserRecord,
  ): PublicUserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: roleProfiles[user.role].permissions,
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

  private sessionTtlMs(): number {
    const hours = Number(this.config.get<string>('SESSION_TTL_HOURS', '12'))
    return Math.max(1, hours) * 60 * 60 * 1000
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex')
  }
}
