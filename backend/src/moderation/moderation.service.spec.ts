import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('../security/access-token.service', () => ({ AccessTokenService: class AccessTokenService {} }))
vi.mock('../identity-vault/identity-vault.service', () => ({ IdentityVaultService: class IdentityVaultService {} }))
vi.mock('../mail/mail-queue.service', () => ({ MailQueueService: class MailQueueService {} }))
vi.mock('../audit/audit.service', () => ({ AuditService: class AuditService {} }))

import { ModerationService } from './moderation.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1', siteId: null, buildingId: null } as any
const moderatorUser = { id: 'mod-1', role: 'moderator', organizationId: 'org-1', siteId: 'site-1', buildingId: 'building-1' } as any
const siteUser = { id: 'site-user', role: 'site_manager', organizationId: 'org-1', siteId: 'site-1', buildingId: null } as any
const request = { ip: '127.0.0.1', get: vi.fn(() => 'Vitest') } as any

const building = { id: 'building-1', siteId: 'site-1', organizationId: 'org-1', label: 'Bâtiment 1', code: 'B1' }
const version = { id: 'version-1', status: 'published', openUntil: null, questionnaire: { id: 'q1', title: 'ITQ', organizationId: 'org-1' } }
const terminal = { id: 'terminal-1', code: 'TERM-0001', label: 'Tablette', status: 'active', buildingId: 'building-1', building, invitations: [] }

function invitation(data: Record<string, unknown> = {}) {
  return {
    id: 'invitation-1',
    publicCode: 'ABCD-1234',
    questionnaireVersionId: version.id,
    questionnaireVersion: version,
    buildingId: building.id,
    siteId: building.siteId,
    building,
    tokenHash: 'token-hash',
    status: 'sent',
    deliveryMode: 'email_simulation',
    assistanceMode: 'none',
    notifyModerator: false,
    notifyAdmins: false,
    terminalDeviceId: null,
    terminalDevice: null,
    terminalDispatchedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    sentAt: new Date(),
    openedAt: null,
    startedAt: null,
    submittedAt: null,
    responseSession: null,
    ...data,
  }
}

function makeService(overrides: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const prisma = {
    invitation: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => invitation()),
      updateMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async (args: any) => invitation(args.data)),
      update: vi.fn(async (args: any) => invitation(args.data)),
      delete: vi.fn(async () => undefined),
    },
    questionnaireVersion: { findUnique: vi.fn(async () => version) },
    building: { findUnique: vi.fn(async () => building) },
    terminalDevice: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => terminal),
      findMany: vi.fn(async () => [terminal]),
      create: vi.fn(async (args: any) => ({ ...terminal, ...args.data, building, invitations: [] })),
    },
    ...overrides,
  }
  const accessToken = { create: vi.fn((publicCode: string) => ({ token: `${publicCode}.signed-token`, tokenHash: `${publicCode}-hash` })) }
  const identityVault = {
    hasExistingIdentityForEmail: vi.fn(async () => false),
    createEmailIdentity: vi.fn(async () => undefined),
    recordDeliveryEvent: vi.fn(async () => undefined),
    loadOutboundEmailForInvitation: vi.fn(async () => ({ email: 'patient@example.test' })),
  }
  const mailQueue = { enqueue: vi.fn(() => 'mail-job-1') }
  const audit = { log: vi.fn(async () => undefined) }
  const config = { get: vi.fn(<T = string>(key: string, fallback?: T) => (key in env ? env[key] as T : fallback)) }

  return { service: new ModerationService(prisma as any, accessToken as any, identityVault as any, mailQueue as any, audit as any, config as any), prisma, accessToken, identityVault, mailQueue, audit, config }
}

describe('ModerationService', () => {
  it('lists invitations in user scope and expires overdue invitations', async () => {
    const overdue = invitation({ id: 'expired-1', expiresAt: new Date(Date.now() - 1), deliveryMode: 'email_simulation' })
    const { service, prisma, identityVault, mailQueue } = makeService({
      invitation: {
        findMany: vi.fn()
          .mockResolvedValueOnce([overdue])
          .mockResolvedValueOnce([invitation()]),
        updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => null),
      },
    })

    const result = await service.listForUser(moderatorUser)

    expect(prisma.invitation.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['expired-1'] } }, data: { status: 'expired' } })
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'invitation_expired' }))
    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'expiration', to: { email: 'patient@example.test' } }))
    expect(result[0]).toMatchObject({ publicCode: 'ABCD-1234', deliveryMode: 'email_simulation', questionnaireTitle: 'ITQ' })
  })

  it('creates an email invitation, writes identity vault data and queues mail', async () => {
    const { service, prisma, identityVault, mailQueue, audit } = makeService({}, { FRONTEND_ORIGIN: 'https://app.example.test', EXPOSE_RESPONDENT_DEV_LINKS: 'true' })

    const result = await service.create(adminUser, {
      questionnaireVersionId: version.id,
      buildingId: building.id,
      email: 'patient@example.test',
      deliveryMode: 'email_simulation',
      notifyModerator: true,
    } as any, request)

    expect(prisma.invitation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deliveryMode: 'email_simulation', status: 'sent', notifyModerator: true }) }))
    expect(identityVault.createEmailIdentity).toHaveBeenCalledWith(expect.objectContaining({ email: 'patient@example.test', invitationId: 'invitation-1' }))
    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'invitation', subject: expect.stringContaining('Invitation à répondre') }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'invitation.create' }))
    expect(result.accessToken).toContain('.signed-token')
    expect(result.devAccessLink).toContain('https://app.example.test/r/')
  })

  it('never exposes respondent tokens in production', async () => {
    const { service } = makeService({}, { NODE_ENV: 'production' })

    const result = await service.create(adminUser, {
      questionnaireVersionId: version.id,
      buildingId: building.id,
      email: 'patient@example.test',
      deliveryMode: 'email',
    } as any, request)

    expect(result.accessToken).toBeNull()
    expect(result.devAccessLink).toBeNull()
  })

  it('creates onsite terminal invitations without email identity or direct token exposure', async () => {
    const { service, prisma, identityVault, mailQueue, audit } = makeService()

    const result = await service.create(siteUser, {
      questionnaireVersionId: version.id,
      buildingId: building.id,
      deliveryMode: 'onsite_terminal',
      terminalDeviceId: terminal.id,
      assistanceMode: 'staff_assisted',
    } as any, request)

    expect(prisma.terminalDevice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: terminal.id, buildingId: building.id, status: { in: ['active'] } }) }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'terminal_invitation_assigned' }))
    expect(mailQueue.enqueue).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'invitation.create.onsite_terminal' }))
    expect(result).toMatchObject({ accessToken: null, devAccessLink: null })
  })

  it('records paper forms and refusals without email identity or respondent link', async () => {
    const { service, identityVault, mailQueue, audit } = makeService()

    const paper = await service.create(adminUser, {
      questionnaireVersionId: version.id,
      buildingId: building.id,
      deliveryMode: 'paper_form',
    } as any, request)
    const refusal = await service.create(adminUser, {
      questionnaireVersionId: version.id,
      buildingId: building.id,
      deliveryMode: 'refusal_record',
      refusalReason: 'Refuse de donner un email ou téléphone',
    } as any, request)

    expect(identityVault.createEmailIdentity).not.toHaveBeenCalled()
    expect(mailQueue.enqueue).not.toHaveBeenCalled()
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'paper_form_recorded' }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'participation_refusal_recorded' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'invitation.create.paper_form' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'participation.refusal.record' }))
    expect(paper).toMatchObject({ accessToken: null, devAccessLink: null })
    expect(refusal.invitation).toMatchObject({ deliveryMode: 'refusal_record', status: 'cancelled' })
  })

  it('rejects invalid invitation creation cases', async () => {
    await expect(makeService().service.create(moderatorUser, { questionnaireVersionId: version.id, buildingId: 'other', email: 'p@test' } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(makeService({ questionnaireVersion: { findUnique: vi.fn(async () => ({ ...version, status: 'draft' })) } }).service.create(adminUser, { questionnaireVersionId: version.id, buildingId: building.id, email: 'p@test' } as any, request)).rejects.toBeInstanceOf(BadRequestException)
    await expect(makeService().service.create(adminUser, { questionnaireVersionId: version.id, buildingId: building.id, deliveryMode: 'email' } as any, request)).rejects.toBeInstanceOf(BadRequestException)
    await expect(makeService({ terminalDevice: { findFirst: vi.fn(async () => null) } }).service.create(adminUser, { questionnaireVersionId: version.id, buildingId: building.id, deliveryMode: 'onsite_terminal', terminalDeviceId: 'missing' } as any, request)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('resends email invitations with renewed tokens and records delivery', async () => {
    const { service, prisma, identityVault, mailQueue, audit } = makeService()

    const result = await service.resend(adminUser, 'invitation-1', request)

    expect(prisma.invitation.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sent', tokenHash: 'ABCD-1234-hash' }) }))
    expect(identityVault.loadOutboundEmailForInvitation).toHaveBeenCalledWith('invitation-1')
    expect(mailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: 'reminder', to: { email: 'patient@example.test' } }))
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'invitation_reminder_queued' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'invitation.resend' }))
    expect(result.invitation.status).toBe('sent')
  })

  it('blocks impossible resends and redispatches terminal invitations', async () => {
    await expect(makeService({ invitation: { findFirst: vi.fn(async () => null) } }).service.resend(adminUser, 'missing', request)).rejects.toBeInstanceOf(NotFoundException)
    await expect(makeService({ invitation: { findFirst: vi.fn(async () => invitation({ status: 'submitted' })) } }).service.resend(adminUser, 'invitation-1', request)).rejects.toBeInstanceOf(BadRequestException)

    const { service, identityVault, audit, mailQueue } = makeService({ invitation: { findFirst: vi.fn(async () => invitation({ deliveryMode: 'onsite_terminal', terminalDeviceId: terminal.id })) , update: vi.fn(async (args: any) => invitation({ deliveryMode: 'onsite_terminal', terminalDeviceId: terminal.id, ...args.data })) } })
    await service.resend(adminUser, 'invitation-1', request)
    expect(mailQueue.enqueue).not.toHaveBeenCalled()
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'terminal_invitation_redispatched' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'invitation.redispatch.onsite_terminal' }))
  })

  it('registers and lists terminal devices from moderation workflow', async () => {
    const { service, prisma, audit } = makeService({}, { FRONTEND_ORIGIN: 'https://app.example.test' })

    const registered = await service.registerTerminalDevice(siteUser, { buildingId: building.id, label: ' Accueil ' } as any, request)
    const listed = await service.listTerminalDevices(moderatorUser)

    expect(prisma.terminalDevice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ label: 'Accueil', status: 'active' }) }))
    expect(registered.terminalLaunchLink).toContain('https://app.example.test/terminal/')
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'terminal_device.register' }))
    expect(listed[0]).toMatchObject({ code: terminal.code, pendingInvitationCount: 0 })
  })
})
