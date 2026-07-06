import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('../identity-vault/identity-vault.service', () => ({ IdentityVaultService: class IdentityVaultService {} }))
vi.mock('../mail/mail-queue.service', () => ({ MailQueueService: class MailQueueService {} }))
vi.mock('../audit/audit.service', () => ({ AuditService: class AuditService {} }))

import { NotificationsService } from './notifications.service'

const adminUser = { id: 'admin-1', role: 'admin', email: 'admin@example.test', displayName: 'Admin', organizationId: 'org-1', siteId: null, buildingId: null } as any
const moderatorUser = { id: 'mod-1', role: 'moderator', email: 'mod@example.test', displayName: 'Mod', organizationId: 'org-1', siteId: 'site-1', buildingId: 'building-1' } as any
const request = { ip: '127.0.0.1' } as any
const building = { id: 'building-1', siteId: 'site-1', organizationId: 'org-1' }
const version = { id: 'version-1', status: 'published', questionnaire: { id: 'q1', organizationId: 'org-1', title: 'ITQ', code: 'ITQ' } }
const immediateSubscription = {
  id: 'sub-1',
  userId: 'admin-1',
  user: adminUser,
  eventType: 'submission_received',
  channel: 'email',
  frequency: 'immediate',
  isEnabled: true,
  buildingId: null,
  questionnaireVersionId: null,
  digestHour: 8,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastDeliveredAt: null,
}
const dailySubscription = { ...immediateSubscription, id: 'sub-daily', frequency: 'daily', userId: 'admin-1' }

function makeService(overrides: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const prisma = {
    notificationSubscription: {
      findMany: vi.fn(async () => [immediateSubscription]),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: any) => ({ id: 'sub-created', ...args.data, questionnaireVersion: null })),
      update: vi.fn(async (args: any) => ({ ...immediateSubscription, ...args.data })),
    },
    building: { findUnique: vi.fn(async () => building) },
    questionnaireVersion: { findUnique: vi.fn(async () => version) },
    auditLog: { create: vi.fn(async () => undefined) },
    ...overrides,
  }
  const identityVault = {
    recordDeliveryEvent: vi.fn(async () => undefined),
    listDeliveryEventsForDigest: vi.fn(async () => []),
    loadOutboundEmailForInvitation: vi.fn(async () => ({ email: 'patient@example.test' })),
  }
  const mailQueue = { enqueue: vi.fn(() => 'job-1') }
  const audit = { log: vi.fn(async () => undefined) }
  const config = { get: vi.fn(<T = string>(key: string, fallback?: T) => (key in env ? env[key] as T : fallback)) }

  return { service: new NotificationsService(prisma as any, identityVault as any, mailQueue as any, audit as any, config as any), prisma, identityVault, mailQueue, audit, config }
}

describe('NotificationsService', () => {
  it('does not start digest worker when disabled', () => {
    const { service, config } = makeService({}, { ENABLE_NOTIFICATION_DIGEST_WORKER: 'false' })

    service.onModuleInit()

    expect(config.get).toHaveBeenCalledWith('ENABLE_NOTIFICATION_DIGEST_WORKER', 'true')
  })

  it('lists subscriptions owned by the current user', async () => {
    const { service, prisma } = makeService()

    await service.list(adminUser)

    expect(prisma.notificationSubscription.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'admin-1' } }))
  })

  it('creates a scoped subscription and audits it', async () => {
    const { service, prisma, audit } = makeService()

    const result = await service.upsert(adminUser, {
      eventType: 'submission_received',
      channel: 'email',
      frequency: 'daily',
      digestHour: 9,
      buildingId: building.id,
      questionnaireVersionId: version.id,
    } as any, request)

    expect(prisma.building.findUnique).toHaveBeenCalledWith({ where: { id: building.id } })
    expect(prisma.questionnaireVersion.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: version.id } }))
    expect(prisma.notificationSubscription.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'admin-1', frequency: 'daily', digestHour: 9 }) }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification_subscription.create' }))
    expect(result.id).toBe('sub-created')
  })

  it('updates existing subscriptions and disables frequency none', async () => {
    const { service, prisma, audit } = makeService({ notificationSubscription: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => immediateSubscription),
      update: vi.fn(async (args: any) => ({ ...immediateSubscription, ...args.data })),
      create: vi.fn(),
    } })

    const result = await service.upsert(adminUser, { eventType: 'submission_received', channel: 'email', frequency: 'none' } as any, request)

    expect(prisma.notificationSubscription.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ frequency: 'none', isEnabled: false }) }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'notification_subscription.update' }))
    expect(result.isEnabled).toBe(false)
  })

  it('enforces role, production and scope rules during subscription normalization', async () => {
    await expect(makeService().service.upsert({ ...adminUser, role: 'respondent' }, { eventType: 'submission_received', channel: 'email' } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(makeService({}, { NODE_ENV: 'production' }).service.upsert(adminUser, { eventType: 'submission_received', channel: 'simulation' } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(makeService({ building: { findUnique: vi.fn(async () => null) } }).service.upsert(adminUser, { eventType: 'submission_received', buildingId: 'missing' } as any, request)).rejects.toBeInstanceOf(NotFoundException)
    await expect(makeService({ questionnaireVersion: { findUnique: vi.fn(async () => ({ ...version, status: 'draft' })) } }).service.upsert(moderatorUser, { eventType: 'submission_received', questionnaireVersionId: version.id } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('queues immediate submission notifications only for scoped subscribers', async () => {
    const scopedOut = { ...immediateSubscription, id: 'sub-out', userId: 'other', user: { ...adminUser, id: 'other', role: 'moderator', buildingId: 'other' } }
    const { service, prisma, identityVault, mailQueue } = makeService({ notificationSubscription: { findMany: vi.fn(async () => [immediateSubscription, dailySubscription, scopedOut]), update: vi.fn(async () => undefined) }, building: { findUnique: vi.fn(async () => building) } })

    await service.notifySubmissionReceived({ submissionId: 's1', invitationId: 'inv1', publicCode: 'ITQ-0001', questionnaireVersionId: version.id, buildingId: building.id, answerCount: 7, submittedAt: new Date('2026-01-02T12:00:00Z') })

    expect(mailQueue.enqueue).toHaveBeenCalledTimes(1)
    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'submission_notification', to: { email: 'admin@example.test', name: 'Admin' } }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'notification.submission_queued' }) }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'notification.digest_queued' }) }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'notification_submission_queued' }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'notification_digest_queued' }))
    expect(prisma.notificationSubscription.update).toHaveBeenCalledTimes(1)
  })

  it('processes daily digests in dry-run and send modes', async () => {
    const queuedEvents = [
      { publicCode: 'ITQ-0001', metadata: { subscriptionId: 'sub-daily' } },
      { publicCode: 'ITQ-0002', metadata: { subscriptionId: 'sub-daily' } },
      { publicCode: 'IGNORED', metadata: { subscriptionId: 'other' } },
    ]
    const now = new Date('2026-01-03T10:00:00Z')
    const { service, prisma, identityVault, mailQueue } = makeService({ notificationSubscription: { findMany: vi.fn(async () => [{ ...dailySubscription, id: 'sub-daily', user: adminUser }]), update: vi.fn(async () => undefined) } });
    (identityVault.listDeliveryEventsForDigest as any).mockResolvedValue(queuedEvents)

    const dryRun = await service.processDueDailyDigests({ dryRun: true, now })
    expect(dryRun).toMatchObject({ dueSubscriptionCount: 1, deliveredDigestCount: 1, dryRun: true })
    expect(mailQueue.enqueue).not.toHaveBeenCalled()

    const sent = await service.processDueDailyDigests({ now })
    expect(sent.delivered[0]).toMatchObject({ subscriptionId: 'sub-daily', queuedEventCount: 2, publicCodes: ['ITQ-0001', 'ITQ-0002'] })
    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'daily_digest' }))
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'notification.digest_sent' }) }))
    expect(prisma.notificationSubscription.update).toHaveBeenCalledWith({ where: { id: 'sub-daily' }, data: { lastDeliveredAt: now } })
  })

  it('marks empty daily digests delivered without sending email', async () => {
    const now = new Date('2026-01-03T10:00:00Z')
    const { service, prisma, mailQueue } = makeService({ notificationSubscription: { findMany: vi.fn(async () => [{ ...dailySubscription, id: 'sub-empty', user: adminUser }]), update: vi.fn(async () => undefined) } })

    const result = await service.processDueDailyDigests({ now })

    expect(result.deliveredDigestCount).toBe(0)
    expect(mailQueue.enqueue).not.toHaveBeenCalled()
    expect(prisma.notificationSubscription.update).toHaveBeenCalledWith({ where: { id: 'sub-empty' }, data: { lastDeliveredAt: now } })
  })

  it('confirms submitted questionnaires to respondent identity emails when available', async () => {
    const { service, identityVault, mailQueue } = makeService()

    await service.notifySubmissionConfirmation({ submissionId: 's1', invitationId: 'inv1', publicCode: 'ITQ-0001', questionnaireVersionId: version.id, buildingId: building.id, answerCount: 4, submittedAt: new Date('2026-01-02T12:00:00Z') })

    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'submission_confirmation', to: { email: 'patient@example.test' } }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'submission_confirmation_queued' }))
  })

  it('skips respondent confirmation when identity has been removed', async () => {
    const { service, identityVault, mailQueue } = makeService();
    (identityVault.loadOutboundEmailForInvitation as any).mockResolvedValue(null)

    await service.notifySubmissionConfirmation({ submissionId: 's1', invitationId: 'inv1', publicCode: 'ITQ-0001', questionnaireVersionId: version.id, buildingId: building.id, answerCount: 4, submittedAt: new Date() })

    expect(mailQueue.enqueue).not.toHaveBeenCalled()
  })
})
