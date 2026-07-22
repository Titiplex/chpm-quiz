import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { QuestionnairesService } from './questionnaires.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1' } as any
const moderatorUser = { id: 'mod-1', role: 'moderator', organizationId: 'org-1' } as any

const likertScale = { points: 5, minValue: 1, leftAnchor: 'Jamais', rightAnchor: 'Toujours', neutralLabel: 'Parfois', allowNotApplicable: true }
const answerOptions = [
  { id: 'opt-1', value: 'YES', label: 'Oui', displayOrder: 1, isExclusive: false },
  { id: 'opt-2', value: 'NO', label: 'Non', displayOrder: 2, isExclusive: false },
]
const popupDefinition = { id: 'popup-1', termKey: 'stress', language: 'fr', title: 'Stress', body: 'Définition', version: '1.0', glossaryTermId: 'term-1', glossaryTerm: { label: 'Stress', definition: 'Définition métier' } }
const draftVersion = {
  id: 'version-draft',
  questionnaireId: 'q1',
  versionLabel: '0.1-draft',
  language: 'fr',
  status: 'draft',
  description: 'Draft description',
  finality: 'Finalité',
  openFrom: null,
  openUntil: null,
  groups: [
    {
      id: 'group-1',
      title: 'Groupe 1',
      description: 'Description',
      displayOrder: 1,
      questionsPerPage: 2,
      randomize: false,
      conditionExpression: null,
      questions: [
        {
          id: 'question-1',
          groupId: 'group-1',
          code: 'Q-1',
          language: 'fr',
          label: 'Question 1',
          helperText: 'Aide',
          responseType: 'likert',
          isRequired: true,
          displayOrder: 1,
          conditionExpression: null,
          likertScale,
          answerOptions: [],
          popupDefinitions: [popupDefinition],
        },
      ],
    },
  ],
}
const publishedVersion = { ...draftVersion, id: 'version-published', versionLabel: '1.0', status: 'published' }
const questionnaire = {
  id: 'q1',
  code: 'ITQ',
  title: 'Questionnaire ITQ',
  description: 'Description questionnaire',
  defaultLanguage: 'fr',
  finality: 'Finalité',
  status: 'draft',
  ownerUserId: 'admin-1',
  organizationId: 'org-1',
  versions: [draftVersion, publishedVersion],
}

function makeService(overrides: Record<string, unknown> = {}) {
  const tx = {
    question: { create: vi.fn(async () => ({ id: 'question-created' })), update: vi.fn(async () => undefined) },
    likertScale: { upsert: vi.fn(async () => undefined), delete: vi.fn(async () => undefined), create: vi.fn(async () => undefined) },
    answerOption: { createMany: vi.fn(async () => undefined), deleteMany: vi.fn(async () => undefined) },
    popupDefinition: { create: vi.fn(async () => undefined), deleteMany: vi.fn(async () => undefined) },
    glossaryTerm: { upsert: vi.fn(async () => ({ id: 'term-1' })) },
    questionnaireVersion: { create: vi.fn(async () => ({ id: 'draft-clone' })) },
    questionGroup: {
      create: vi.fn(async (args: any) => ({ id: `${args.data.questionnaireVersionId}-group`, ...args.data })),
      update: vi.fn(async () => undefined),
    },
    conditionalRule: { create: vi.fn(async () => undefined) },
    questionnaire: {
      create: vi.fn(async (args: any) => ({ id: 'translated-questionnaire', ...args.data })),
      update: vi.fn(async () => undefined),
    },
  }
  const prisma = {
    questionnaire: {
      findMany: vi.fn(async () => [questionnaire]),
      findFirst: vi.fn(async () => questionnaire),
      findUnique: vi.fn(async () => questionnaire),
      create: vi.fn(async (args: any) => ({ id: 'q-created', ...args.data, versions: [{ ...draftVersion, ...args.data.versions.create, id: 'version-created' }] })),
      update: vi.fn(async () => undefined),
    },
    questionnaireVersion: {
      count: vi.fn(async () => 1),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 'version-new-draft' })),
      update: vi.fn(async () => undefined),
    },
    questionGroup: {
      findFirst: vi.fn(async (args: any) => {
        if ('displayOrder' in (args.where ?? {})) return null
        if (args.orderBy?.displayOrder === 'desc') return { displayOrder: 1 }
        return { ...draftVersion.groups[0]!, questionnaireVersion: draftVersion }
      }),
      create: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
    question: {
      findFirst: vi.fn(async (args: any) => {
        if ('displayOrder' in (args.where ?? {})) return null
        if ('code' in (args.where ?? {})) return null
        if (args.orderBy?.displayOrder === 'desc') return { displayOrder: 1 }
        return { ...draftVersion.groups[0]!.questions[0]!, group: { ...draftVersion.groups[0]!, questionnaireVersion: draftVersion } }
      }),
      update: vi.fn(async () => undefined),
    },
    $transaction: vi.fn(async (callback: (tx: any) => unknown) => callback(tx)),
    ...overrides,
  }

  return { service: new QuestionnairesService(prisma as any), prisma, tx }
}

describe('QuestionnairesService', () => {
  it('lists draft questionnaires for configuring roles and published versions for moderators', async () => {
    const { service, prisma } = makeService()

    const adminResult = await service.listForUser(adminUser)
    expect(prisma.questionnaire.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'org-1' } }))
    expect(adminResult[0]).toMatchObject({ id: 'q1', versionId: 'version-draft', isPublished: false, groupCount: 1, questionCount: 1 })

    await service.listForUser(moderatorUser)
    expect(prisma.questionnaire.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ versions: { some: { status: 'published' } } }) }))
  })

  it('gets one questionnaire with scope checks and mapped question metadata', async () => {
    const { service } = makeService()

    const result = await service.getOneForUser('q1', adminUser)

    expect(result).toMatchObject({
      code: 'ITQ',
      versionLabel: '0.1-draft',
      groups: [{ questions: [{ code: 'Q-1', answerScaleLabel: '5 points (1–5)', popupTerm: 'Stress' }] }],
    })
    expect(result.groups[0]?.questions[0]?.popupDefinitions[0]).toMatchObject({ termLabel: 'Stress', termDefinition: 'Définition métier' })
  })

  it('throws when questionnaire or visible version is missing', async () => {
    await expect(makeService({ questionnaire: { findFirst: vi.fn(async () => null) } }).service.getOneForUser('missing', adminUser)).rejects.toBeInstanceOf(NotFoundException)
    await expect(makeService({ questionnaire: { findFirst: vi.fn(async () => ({ ...questionnaire, versions: [] })) } }).service.getOneForUser('q1', moderatorUser)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates a questionnaire with normalized code and initial draft version', async () => {
    const { service, prisma } = makeService({ questionnaire: { findUnique: vi.fn(async () => null), create: vi.fn(async (args: any) => ({ id: 'q-created', ...args.data, versions: [{ ...draftVersion, id: 'version-created', groups: [] }] })) } })

    const result = await service.create({ code: ' itq demo ', title: '  ITQ Demo ', description: ' ', defaultLanguage: 'fr', finality: '  Finalité ' }, adminUser)

    expect(prisma.questionnaire.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ code: 'ITQ-DEMO', title: 'ITQ Demo', description: null, finality: 'Finalité', ownerUserId: 'admin-1', organizationId: 'org-1' }) }))
    expect(result).toMatchObject({ code: 'ITQ-DEMO', versionLabel: '0.1-draft' })
  })

  it('rejects duplicate questionnaire codes and non-configuring updates', async () => {
    await expect(makeService().service.create({ code: 'ITQ', title: 'ITQ' }, adminUser)).rejects.toBeInstanceOf(ConflictException)
    await expect(makeService().service.updateQuestionnaire('q1', { title: 'Nope' }, moderatorUser)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('updates questionnaire metadata and the draft version', async () => {
    const { service, prisma } = makeService()

    await service.updateQuestionnaire('q1', { title: '  Nouveau ', description: '', defaultLanguage: 'en', finality: null } as any, adminUser)

    expect(prisma.questionnaire.update).toHaveBeenCalledWith({ where: { id: 'q1' }, data: expect.objectContaining({ title: 'Nouveau', description: null, defaultLanguage: 'en', finality: null, status: 'draft' }) })
    expect(prisma.questionnaireVersion.update).toHaveBeenCalledWith({ where: { id: 'version-draft' }, data: expect.objectContaining({ description: null, language: 'en', finality: null, status: 'draft' }) })
  })

  it('creates, updates and archives groups with display-order collision protection', async () => {
    const { service, prisma } = makeService()

    await service.createGroup('q1', { title: ' Nouveau groupe ', questionsPerPage: 4, randomize: true } as any, adminUser)
    expect(prisma.questionGroup.create).toHaveBeenCalledWith({ data: expect.objectContaining({ questionnaireVersionId: 'version-draft', title: 'Nouveau groupe', displayOrder: 2, questionsPerPage: 4, randomize: true }) })

    await service.updateGroup('q1', 'group-1', { title: 'Renommé', displayOrder: 3 } as any, adminUser)
    expect(prisma.questionGroup.update).toHaveBeenCalledWith({ where: { id: 'group-1' }, data: expect.objectContaining({ title: 'Renommé', displayOrder: 3 }) })

    await service.archiveGroup('q1', 'group-1', adminUser)
    expect(prisma.questionGroup.update).toHaveBeenLastCalledWith({ where: { id: 'group-1' }, data: { isArchived: true } })

    const colliding = makeService({ questionGroup: { findFirst: vi.fn(async () => ({ id: 'existing', displayOrder: 2, questionnaireVersion: draftVersion })) } })
    await expect(colliding.service.createGroup('q1', { title: 'Collision', displayOrder: 2 } as any, adminUser)).rejects.toBeInstanceOf(ConflictException)
  })

  it('creates likert and choice questions with validation and popup glossary terms', async () => {
    const { service, prisma, tx } = makeService()

    await service.createQuestion('q1', 'group-1', {
      code: ' q stress ',
      label: '  Stress ressenti ',
      responseType: 'likert',
      isRequired: true,
      likertScale: { points: 5, leftAnchor: 'Non', rightAnchor: 'Oui' },
      popupDefinition: { title: 'Stress', body: 'Définition', termsExplained: ['Stress', 'Charge mentale'] },
    } as any, adminUser)

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(tx.question.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: 'Q-STRESS', label: 'Stress ressenti', responseType: 'likert', tags: ['popup'], likertScale: { create: expect.objectContaining({ points: 5, minValue: 1 }) } }) })
    expect(tx.glossaryTerm.upsert).toHaveBeenCalledTimes(2)
    expect(tx.popupDefinition.create).toHaveBeenCalledTimes(2)

    await expect(service.createQuestion('q1', 'group-1', { code: 'Q', label: 'Q', responseType: 'likert' } as any, adminUser)).rejects.toBeInstanceOf(BadRequestException)
    await expect(service.createQuestion('q1', 'group-1', { code: 'Q', label: 'Q', responseType: 'single_choice', answerOptions: [{ value: 'yes', label: 'Oui' }, { value: 'YES', label: 'Oui encore' }] } as any, adminUser)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('updates questions and removes incompatible type-specific children', async () => {
    const question = { ...draftVersion.groups[0]!.questions[0]!, answerOptions, group: { ...draftVersion.groups[0]!, questionnaireVersion: draftVersion } }
    const { service, prisma, tx } = makeService({ question: { findFirst: vi.fn(async () => question), update: vi.fn(async () => undefined) } })

    await service.updateQuestion('q1', 'question-1', {
      responseType: 'single_choice',
      answerOptions: [{ value: 'yes', label: 'Oui' }, { value: 'no', label: 'Non' }],
      popupDefinition: null,
    } as any, adminUser)

    expect(tx.question.update).toHaveBeenCalledWith({ where: { id: 'question-1' }, data: expect.objectContaining({ responseType: 'single_choice', tags: [] }) })
    expect(tx.likertScale.delete).toHaveBeenCalledWith({ where: { questionId: 'question-1' } })
    expect(tx.answerOption.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'question-1' } })
    expect(tx.answerOption.createMany).toHaveBeenCalledWith({ data: [
      { questionId: 'question-1', value: 'yes', label: 'Oui', displayOrder: 1, isExclusive: false },
      { questionId: 'question-1', value: 'no', label: 'Non', displayOrder: 2, isExclusive: false },
    ] })

    await service.archiveQuestion('q1', 'question-1', adminUser)
    expect(prisma.question.update).toHaveBeenCalledWith({ where: { id: 'question-1' }, data: { isArchived: true } })
  })

  it('clones published versions to new drafts with rewritten references', async () => {
    const oldGroupId = '11111111-1111-1111-1111-111111111111'
    const oldQuestionId = '22222222-2222-2222-2222-222222222222'
    const published = {
      ...publishedVersion,
      id: 'published-source',
      groups: [{
        ...draftVersion.groups[0]!,
        id: oldGroupId,
        questions: [{ ...draftVersion.groups[0]!.questions[0]!, id: oldQuestionId, likertScale, answerOptions, popupDefinitions: [popupDefinition] }],
      }],
      conditionalRules: [{ id: 'rule-1', code: 'RULE-1', trigger: { groupId: oldGroupId, questionId: oldQuestionId }, effect: [oldQuestionId], priority: 1, isActive: true }],
    }
    const { service, prisma, tx } = makeService({
      questionnaire: {
        findMany: vi.fn(async () => [questionnaire]),
        findFirst: vi.fn(async () => questionnaire),
        findUnique: vi.fn(async () => ({ ...questionnaire, versions: [] })),
        create: vi.fn(),
        update: vi.fn(async () => undefined),
      },
      questionnaireVersion: { count: vi.fn(async () => 3), findFirst: vi.fn(async () => published), create: vi.fn(), update: vi.fn(async () => undefined) },
    })

    await service.updateQuestionnaire('q1', { title: 'Clone me' }, adminUser)

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(tx.questionnaireVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ versionLabel: '0.4-draft', status: 'draft' }) })
    expect(tx.questionGroup.create).toHaveBeenCalled()
    expect(tx.question.create).toHaveBeenCalled()
    expect(tx.conditionalRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ trigger: expect.not.objectContaining({ groupId: oldGroupId }), effect: expect.not.arrayContaining([oldQuestionId]) }) })
  })

  it('creates an independent translation draft and rewrites all conditional references', async () => {
    const source = {
      ...questionnaire,
      versions: [{
        ...draftVersion,
        groups: [{
          ...draftVersion.groups[0]!,
          conditionExpression: { questionId: 'question-1' },
          questions: [{
            ...draftVersion.groups[0]!.questions[0]!,
            conditionExpression: { groupId: 'group-1' },
          }],
        }],
        conditionalRules: [{
          code: 'RULE-1',
          trigger: { questionId: 'question-1' },
          effect: { groupId: 'group-1' },
          priority: 1,
          isActive: true,
        }],
      }],
    }
    const { service, tx } = makeService({
      questionnaire: {
        findMany: vi.fn(async () => [questionnaire]),
        findFirst: vi.fn(async () => questionnaire),
        findUnique: vi.fn(async (args: any) => args.where.id ? source : null),
        create: vi.fn(),
        update: vi.fn(async () => undefined),
      },
    })

    await service.createTranslationDraft('q1', { language: 'en', title: 'English title' }, adminUser)

    expect(tx.questionnaire.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      code: 'ITQ-EN',
      defaultLanguage: 'en',
      organizationId: 'org-1',
    }) })
    expect(tx.questionnaireVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      questionnaireId: 'translated-questionnaire',
      language: 'en',
      status: 'draft',
    }) })
    expect(tx.questionGroup.update).toHaveBeenCalledWith({
      where: { id: 'draft-clone-group' },
      data: { conditionExpression: { questionId: 'question-created' } },
    })
    expect(tx.question.update).toHaveBeenCalledWith({
      where: { id: 'question-created' },
      data: { conditionExpression: { groupId: 'draft-clone-group' } },
    })
    expect(tx.conditionalRule.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      trigger: { questionId: 'question-created' },
      effect: { groupId: 'draft-clone-group' },
    }) })
  })
})
