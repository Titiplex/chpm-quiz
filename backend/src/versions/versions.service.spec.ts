import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { VersionsService } from './versions.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1' } as any
const questionnaire = { id: 'q1', code: 'ITQ', defaultLanguage: 'fr', finality: 'Finalité', organizationId: 'org-1' }
const groupId = '11111111-1111-4111-8111-111111111111'
const questionId = '22222222-2222-4222-8222-222222222222'
const validVersion = {
  id: 'version-1',
  questionnaireId: 'q1',
  versionLabel: '1.0',
  language: 'fr',
  status: 'draft',
  questionnaire,
  conditionalRules: [],
  groups: [{
    id: groupId,
    title: 'Groupe',
    questionsPerPage: 2,
    conditionExpression: null,
    questions: [{
      id: questionId,
      code: 'Q-1',
      label: 'Question',
      language: 'fr',
      responseType: 'likert',
      isRequired: true,
      conditionExpression: null,
      likertScale: { points: 5 },
      answerOptions: [],
      popupDefinitions: [{ termKey: 'stress', title: 'Stress', body: 'Définition', language: 'fr' }],
    }],
  }],
}

function makeService(overrides: Record<string, unknown> = {}) {
  const tx = {
    questionnaireVersion: { update: vi.fn(async (args: any) => ({ id: 'version-1', ...args.data })) },
    questionnaire: { update: vi.fn(async () => undefined) },
  }
  const prisma = {
    questionnaire: { findUnique: vi.fn(async () => questionnaire), update: vi.fn(async () => undefined) },
    questionnaireVersion: {
      findMany: vi.fn(async () => [validVersion]),
      findUnique: vi.fn(async () => validVersion),
      create: vi.fn(async (args: any) => ({ id: 'version-created', ...args.data })),
      update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    conditionalRule: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => ({ id: 'rule-1', questionnaireVersionId: 'version-1' })),
      create: vi.fn(async (args: any) => ({ id: 'rule-created', ...args.data })),
      update: vi.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
    },
    $transaction: vi.fn(async (callback: (tx: any) => unknown) => callback(tx)),
    ...overrides,
  }

  return { service: new VersionsService(prisma as any), prisma, tx }
}

describe('VersionsService', () => {
  it('lists versions after questionnaire scope check', async () => {
    const { service, prisma } = makeService()

    await expect(service.list('q1', adminUser)).resolves.toEqual([validVersion])
    expect(prisma.questionnaire.findUnique).toHaveBeenCalledWith({ where: { id: 'q1' } })
    expect(prisma.questionnaireVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { questionnaireId: 'q1' } }))
  })

  it('creates draft versions with inherited defaults and rejects duplicates', async () => {
    const { service, prisma } = makeService({ questionnaireVersion: { findUnique: vi.fn(async () => null), create: vi.fn(async (args: any) => ({ id: 'created', ...args.data })) } })

    const result = await service.create('q1', { versionLabel: '2.0', openFrom: '2026-01-01T00:00:00Z', openUntil: '2026-02-01T00:00:00Z' }, adminUser)

    expect(prisma.questionnaireVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ questionnaireId: 'q1', versionLabel: '2.0', language: 'fr', finality: 'Finalité', status: 'draft', openFrom: expect.any(Date), openUntil: expect.any(Date) }) })
    expect(result.status).toBe('draft')

    await expect(makeService().service.create('q1', { versionLabel: '1.0' }, adminUser)).rejects.toBeInstanceOf(ConflictException)
    await expect(makeService({ questionnaire: { findUnique: vi.fn(async () => null) } }).service.create('missing', { versionLabel: '1.0' }, adminUser)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates, updates, archives and lists conditional rules on draft versions', async () => {
    const { service, prisma } = makeService()

    await service.createRule('version-1', { code: ' rule 1 ', trigger: { when: 'Q-1' }, effect: { show: groupId } } as any, adminUser)
    expect(prisma.conditionalRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: 'RULE-1', priority: 100, isActive: true }) })

    await service.updateRule('version-1', 'rule-1', { code: 'updated', priority: 10, isActive: false } as any, adminUser)
    expect(prisma.conditionalRule.update).toHaveBeenCalledWith({ where: { id: 'rule-1' }, data: expect.objectContaining({ code: 'UPDATED', priority: 10, isActive: false }) })

    await service.archiveRule('version-1', 'rule-1', adminUser)
    expect(prisma.conditionalRule.update).toHaveBeenLastCalledWith({ where: { id: 'rule-1' }, data: { isActive: false } })

    await service.listRules('version-1', adminUser)
    expect(prisma.conditionalRule.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { questionnaireVersionId: 'version-1' } }))
  })

  it('rejects rule mutations outside existing draft versions', async () => {
    await expect(makeService({ questionnaireVersion: { findUnique: vi.fn(async () => null) } }).service.createRule('missing', { code: 'R' } as any, adminUser)).rejects.toBeInstanceOf(NotFoundException)
    await expect(makeService({ questionnaireVersion: { findUnique: vi.fn(async () => ({ ...validVersion, status: 'published' })) } }).service.createRule('version-1', { code: 'R' } as any, adminUser)).rejects.toBeInstanceOf(BadRequestException)
    await expect(makeService({ conditionalRule: { findFirst: vi.fn(async () => null) }, questionnaireVersion: { findUnique: vi.fn(async () => validVersion) } }).service.updateRule('version-1', 'missing-rule', {}, adminUser)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('validates publishable versions and reports actionable errors', async () => {
    const { service } = makeService()

    await expect(service.validatePublication('version-1', adminUser)).resolves.toEqual({ canPublish: true, errors: [] })

    const invalid = {
      ...validVersion,
      groups: [{
        ...validVersion.groups[0]!,
        title: '',
        questionsPerPage: 0,
        conditionExpression: { ref: '99999999-9999-4999-8999-999999999999', code: 'Q-MISSING' },
        questions: [{ ...validVersion.groups[0]!.questions[0]!, label: '', language: 'en', likertScale: null, popupDefinitions: [{ termKey: '', title: '', body: '', language: 'en' }] }],
      }],
      conditionalRules: [{ code: 'BROKEN', isActive: true, trigger: { questionCode: 'Q-MISSING' }, effect: { id: '99999999-9999-4999-8999-999999999999' } }],
    }
    const invalidService = makeService({ questionnaireVersion: { findUnique: vi.fn(async () => invalid) } }).service
    const report = await invalidService.validatePublication('version-1', adminUser)

    expect(report.canPublish).toBe(false)
    expect(report.errors.join(' | ')).toContain('n’a pas de titre')
    expect(report.errors.join(' | ')).toContain('code question introuvable')
  })

  it('publishes valid draft versions transactionally and rejects invalid states', async () => {
    const { service, prisma, tx } = makeService()

    const published = await service.publish('version-1', adminUser)

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(tx.questionnaireVersion.update).toHaveBeenCalledWith({ where: { id: 'version-1' }, data: expect.objectContaining({ status: 'published', publishedAt: expect.any(Date), immutableAt: expect.any(Date) }) })
    expect(tx.questionnaire.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { status: 'published' } })
    expect(published.status).toBe('published')

    await expect(makeService({ questionnaireVersion: { findUnique: vi.fn(async () => ({ ...validVersion, status: 'published' })) } }).service.publish('version-1', adminUser)).rejects.toBeInstanceOf(BadRequestException)
  })
})
