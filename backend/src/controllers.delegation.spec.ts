import { describe, expect, it, vi } from 'vitest'

import { BuildingsController } from './buildings/buildings.controller'
import { ComplianceController } from './compliance/compliance.controller'
import { NotificationsController } from './notifications/notifications.controller'
import { MeController } from './profile/me.controller'
import { TerminalAdminController } from './terminal-admin/terminal-admin.controller'
import { TerminalController } from './terminal/terminal.controller'

const user = { id: 'user-1', role: 'admin' } as any
const request = { ip: '127.0.0.1' } as any

describe('controller delegation contracts', () => {
  it('delegates buildings listing', async () => {
    const service = { listForUser: vi.fn(async () => [{ id: 'building-1' }]) }
    const controller = new BuildingsController(service as any)

    await expect(controller.list(user)).resolves.toEqual({ buildings: [{ id: 'building-1' }] })
    expect(service.listForUser).toHaveBeenCalledWith(user)
  })

  it('delegates compliance register, maintenance and exports', async () => {
    const service = {
      technicalRegister: vi.fn(() => ({ controller: 'CHPM' })),
      retentionPolicy: vi.fn(() => ({ rules: [] })),
      expireInvitations: vi.fn(async () => ({ expiredCount: 1 })),
      cleanupExpiredDrafts: vi.fn(async () => ({ deletedDraftSessionCount: 2 })),
      pseudonymizedExport: vi.fn(async () => ({ rowCount: 3 })),
    }
    const controller = new ComplianceController(service as any)

    expect(controller.technicalRegister(user)).toEqual({ register: { controller: 'CHPM' } })
    expect(controller.retentionPolicy()).toEqual({ policy: { rules: [] } })
    await expect(controller.expireInvitations(user, request)).resolves.toEqual({ result: { expiredCount: 1 } })
    await expect(controller.cleanupDrafts(user, request)).resolves.toEqual({ result: { deletedDraftSessionCount: 2 } })
    await expect(controller.pseudonymizedExport({ questionnaireId: 'q1' } as any, user, request)).resolves.toEqual({ export: { rowCount: 3 } })
    expect(service.pseudonymizedExport).toHaveBeenCalledWith('q1', user, request)
  })

  it('delegates notification listing, digest processing and upsert', async () => {
    const service = {
      list: vi.fn(async () => [{ id: 'sub-1' }]),
      processDueDailyDigests: vi.fn(async () => ({ deliveredDigestCount: 1 })),
      upsert: vi.fn(async () => ({ id: 'sub-1' })),
    }
    const controller = new NotificationsController(service as any)

    await expect(controller.list(user)).resolves.toEqual({ subscriptions: [{ id: 'sub-1' }] })
    await expect(controller.runDailyDigests()).resolves.toEqual({ result: { deliveredDigestCount: 1 } })
    await expect(controller.upsert({ eventType: 'submission_received' } as any, user, request)).resolves.toEqual({ subscription: { id: 'sub-1' } })
  })

  it('delegates terminal administration actions', async () => {
    const service = {
      listForUser: vi.fn(async () => [{ id: 'terminal-1' }]),
      create: vi.fn(async () => ({ terminalDevice: { id: 'terminal-1' } })),
      update: vi.fn(async () => ({ terminalDevice: { id: 'terminal-1', status: 'paused' } })),
      revoke: vi.fn(async () => ({ terminalDevice: { id: 'terminal-1', status: 'revoked' } })),
      regenerateToken: vi.fn(async () => ({ terminalAccessToken: 'token' })),
    }
    const controller = new TerminalAdminController(service as any)

    await expect(controller.list(user)).resolves.toEqual({ terminalDevices: [{ id: 'terminal-1' }] })
    await expect(controller.create({ buildingId: 'b1', label: 'T' } as any, user, request)).resolves.toEqual({ terminalDevice: { id: 'terminal-1' } })
    await expect(controller.update('terminal-1', { status: 'paused' } as any, user, request)).resolves.toEqual({ terminalDevice: { id: 'terminal-1', status: 'paused' } })
    await expect(controller.revoke('terminal-1', user, request)).resolves.toEqual({ terminalDevice: { id: 'terminal-1', status: 'revoked' } })
    await expect(controller.regenerateToken('terminal-1', user, request)).resolves.toEqual({ terminalAccessToken: 'token' })
  })

  it('delegates public terminal session and invitation opening', async () => {
    const service = { getSession: vi.fn(async () => ({ terminal: { id: 'terminal-1' } })), openInvitation: vi.fn(async () => ({ invitation: { id: 'inv-1' } })) }
    const controller = new TerminalController(service as any)

    await expect(controller.session('terminal-token')).resolves.toEqual({ terminal: { id: 'terminal-1' } })
    await expect(controller.openInvitation('inv-1', { terminalToken: 'terminal-token' } as any, request)).resolves.toEqual({ invitation: { id: 'inv-1' } })
    expect(service.openInvitation).toHaveBeenCalledWith('inv-1', 'terminal-token', request)
  })

  it('delegates legacy /me profile mapping', () => {
    const auth = { toPublicProfile: vi.fn(() => ({ id: 'user-1', permissions: [] })) }
    const controller = new MeController(auth as any)

    expect(controller.me(user)).toEqual({ user: { id: 'user-1', permissions: [] } })
  })
})
