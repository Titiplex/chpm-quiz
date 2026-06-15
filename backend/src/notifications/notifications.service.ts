import { Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import type { UpsertNotificationSubscriptionDto } from './dto/upsert-notification-subscription.dto'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.notificationSubscription.findMany({
      where: { userId: user.id },
      orderBy: [{ eventType: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async upsert(user: AuthenticatedUser, dto: UpsertNotificationSubscriptionDto, request: Request) {
    const existing = await this.prisma.notificationSubscription.findFirst({
      where: {
        userId: user.id,
        eventType: dto.eventType,
        questionnaireVersionId: dto.questionnaireVersionId ?? null,
        buildingId: dto.buildingId ?? null,
        channel: dto.channel ?? 'email',
      },
    })

    const subscription = existing
      ? await this.prisma.notificationSubscription.update({
          where: { id: existing.id },
          data: { isEnabled: dto.isEnabled ?? true },
        })
      : await this.prisma.notificationSubscription.create({
          data: {
            userId: user.id,
            eventType: dto.eventType,
            channel: dto.channel ?? 'email',
            questionnaireVersionId: dto.questionnaireVersionId,
            buildingId: dto.buildingId,
            isEnabled: dto.isEnabled ?? true,
          },
        })

    await this.auditService.log({
      actor: user,
      action: existing ? 'notification_subscription.update' : 'notification_subscription.create',
      entityType: 'NotificationSubscription',
      entityId: subscription.id,
      request,
      metadata: { eventType: subscription.eventType, channel: subscription.channel, isEnabled: subscription.isEnabled },
    })

    return subscription
  }
}
