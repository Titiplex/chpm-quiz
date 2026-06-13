import { Injectable } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    if (user.role === 'moderator') {
      if (!user.buildingId) {
        return []
      }

      return this.prisma.building.findMany({
        where: { id: user.buildingId },
        orderBy: [{ country: 'asc' }, { city: 'asc' }, { label: 'asc' }],
        include: { site: true },
      })
    }

    if (user.role === 'site_manager' && user.siteId) {
      return this.prisma.building.findMany({
        where: { siteId: user.siteId },
        orderBy: [{ country: 'asc' }, { city: 'asc' }, { label: 'asc' }],
        include: { site: true },
      })
    }

    return this.prisma.building.findMany({
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { label: 'asc' }],
      include: { site: true },
    })
  }
}
