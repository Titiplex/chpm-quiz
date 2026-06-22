import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { TerminalService } from './terminal.service'

const terminalToken = 'terminal-token'
const respondentToken = 'respondent-token'
const nowFuture = new Date(Date.now() + 60_000)

function makeInvitation(overrides: Record<string, unknown> = {}): any {
  const building = { id: 'building-1', label: 'Bâtiment A', code: 'A', city: 'Montréal', country: 'Canada', timezone: 'America/Montreal' }
  const terminalDevice = { id: 'terminal-1', code: 'TERM-A', label: 'Tablette A', status: 'active', buildingId: building.id, building }

  return {
    id: 'invitation-1',
    publicCode: 'TERM-0001',
    status: 'sent',
    deliveryMode: 'onsite_terminal',
    assistanceMode: 'none',
    buildingId: building.id,
    building,
    terminalDeviceId: terminalDevice.id,
    terminalDevice,
    questionnaireVersionId: 'version-1',
    questionnaireVersion: { versionLabel: '1.0', questionnaire: { title: 'Questionnaire' } },
    expiresAt: nowFuture,
    sentAt: new Date(),
    openedAt: null,
    startedAt: null,
    submittedAt: null,
    terminalDispatchedAt: null,
    responseSession: null,
    ...overrides,
  }
}

function makeService(invitation = makeInvitation()) {
  const terminalDevice = invitation.terminalDevice
  const prisma = {
    terminalDevice: {
      findUnique: vi.fn(async () => terminalDevice),
      update: vi.fn(async () => terminalDevice),
    },
    invitation: {
      findMany: vi.fn(async () => [invitation]),
      findUnique: vi.fn(async () => invitation),
      update: vi.fn(async () => ({ ...invitation, status: 'opened', tokenHash: 'respondent-hash' })),
    },
  }
  const accessToken = {
    verify: vi.fn(() => ({ publicCode: terminalDevice.code, tokenHash: 'terminal-hash' })),
    create: vi.fn(() => ({ token: respondentToken, tokenHash: 'respondent-hash' })),
  }
  const audit = { log: vi.fn() }
  const config = { get: vi.fn((_key: string, fallback?: string) => fallback) }

  ;(terminalDevice as any).accessTokenHash = 'terminal-hash'

  return { service: new TerminalService(prisma as any, accessToken as any, audit as any, config as any), prisma, accessToken, audit, terminalDevice }
}

describe('TerminalService', () => {
  it('lists only active invitations assigned to the resolved terminal and building', async () => {
    const { service, prisma, terminalDevice } = makeService()

    const result = await service.getSession(terminalToken)

    expect(prisma.invitation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deliveryMode: 'onsite_terminal',
        terminalDeviceId: terminalDevice.id,
        buildingId: terminalDevice.buildingId,
      }),
    }))
    expect(result.terminalDevice.id).toBe(terminalDevice.id)
    expect(result.invitations).toHaveLength(1)
  })

  it('rejects an invitation assigned to another terminal', async () => {
    const invitation = makeInvitation({ terminalDeviceId: 'other-terminal' })
    const { service } = makeService(invitation)

    await expect(service.openInvitation(invitation.id, terminalToken)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('rotates a respondent token when a terminal opens an invitation', async () => {
    const invitation = makeInvitation()
    const { service, prisma, accessToken, audit } = makeService(invitation)

    const result = await service.openInvitation(invitation.id, terminalToken)

    expect(accessToken.create).toHaveBeenCalledWith(invitation.publicCode)
    expect(prisma.invitation.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: invitation.id },
      data: expect.objectContaining({ tokenHash: 'respondent-hash', status: 'opened' }),
    }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'terminal.invitation.open' }))
    expect(result.accessToken).toBe(respondentToken)
    expect(result.respondentAccessLink).toContain('terminalToken=')
  })

  it('rejects already submitted invitations', async () => {
    const invitation = makeInvitation({ status: 'submitted' })
    const { service } = makeService(invitation)

    await expect(service.openInvitation(invitation.id, terminalToken)).rejects.toBeInstanceOf(BadRequestException)
  })
})
