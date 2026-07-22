import { BadRequestException, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { AuditController } from './audit/audit.controller'
import { AuditService } from './audit/audit.service'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { OidcService } from './auth/oidc.service'
import type { AuthenticatedUser } from './auth/auth.types'
import { RolesGuard } from './common/guards/roles.guard'
import { SessionAuthGuard } from './common/guards/session-auth.guard'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'
import { JudicialController } from './judicial/judicial.controller'
import { JudicialService } from './judicial/judicial.service'
import { ModerationController } from './moderation/moderation.controller'
import { ModerationService } from './moderation/moderation.service'
import { QuestionnairesController } from './questionnaires/questionnaires.controller'
import { QuestionnairesService } from './questionnaires/questionnaires.service'
import { RespondentController } from './respondent/respondent.controller'
import { RespondentService } from './respondent/respondent.service'
import { StatsController } from './stats/stats.controller'
import { StatsService } from './stats/stats.service'
import { VersionsController } from './versions/versions.controller'
import { VersionsService } from './versions/versions.service'

const testUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'admin@chpm.local',
  displayName: 'Admin CHPM',
  role: 'admin',
  organizationId: 'org-1',
  siteId: null,
  buildingId: null,
  isActive: true,
  building: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function toFrenchValidationMessages(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property
    const ownMessages = Object.values(error.constraints ?? {}).map(
      (message) => `${propertyPath} ${String(message)}`,
    )
    const childMessages = toFrenchValidationMessages(error.children ?? [], propertyPath)
    return [...ownMessages, ...childMessages]
  })
}

describe('API route contracts', () => {
  let app: INestApplication

  const authService = {
    login: vi.fn(async () => testUser),
    logout: vi.fn(async () => undefined),
    toPublicProfile: vi.fn((user: AuthenticatedUser) => user),
  }
  const questionnairesService = {
    listForUser: vi.fn(async () => [{ id: 'questionnaire-1' }]),
    getOneForUser: vi.fn(async (id: string) => ({ id })),
    create: vi.fn(async () => ({ id: 'questionnaire-1', code: 'ITQ', versionId: 'version-1' })),
    updateQuestionnaire: vi.fn(async (id: string) => ({ id, code: 'ITQ', versionId: 'version-1' })),
    createGroup: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
    updateGroup: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
    archiveGroup: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
    createQuestion: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
    updateQuestion: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
    archiveQuestion: vi.fn(async (id: string) => ({ id, versionId: 'version-1' })),
  }
  const versionsService = {
    list: vi.fn(async () => [{ id: 'version-1' }]),
    create: vi.fn(async () => ({ id: 'version-1', versionLabel: 'v1' })),
    listRules: vi.fn(async () => [{ id: 'rule-1' }]),
    createRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    updateRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    archiveRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    publish: vi.fn(async () => ({ id: 'version-1', versionLabel: 'v1' })),
  }
  const moderationService = {
    listForUser: vi.fn(async () => [{ id: 'invitation-1' }]),
    create: vi.fn(async () => ({ invitation: { id: 'invitation-1', publicCode: 'CODE-1' } })),
    resend: vi.fn(async () => ({ invitation: { id: 'invitation-1', status: 'sent' } })),
    listTerminalDevices: vi.fn(async () => [{ id: 'terminal-1' }]),
    registerTerminalDevice: vi.fn(async () => ({ terminalDevice: { id: 'terminal-1' } })),
  }
  const respondentService = {
    getSession: vi.fn(async () => ({ responseSession: { id: 'session-1' }, questionnaire: { groups: [] } })),
    saveAnswers: vi.fn(async () => ({ responseSession: { id: 'session-1' }, saved: 1 })),
    recordTelemetry: vi.fn(async () => ({ ok: true })),
    submit: vi.fn(async () => ({ submission: { id: 'submission-1' } })),
  }
  const statsService = {
    questionnaireStats: vi.fn(async () => ({
      threshold: 5,
      totals: { submitted: 6 },
      submissions: [{ publicCode: 'CODE-1' }],
    })),
    questionStats: vi.fn(async () => ({
      questionnaire: { id: 'questionnaire-1' },
      question: { id: 'question-1', code: 'Q1' },
    })),
    submission: vi.fn(async () => ({ questionnaire: 'ITQ', answerCount: 3 })),
  }
  const auditService = {
    log: vi.fn(async () => undefined),
    listForUser: vi.fn(async () => [{ id: 'audit-1' }]),
  }
  const judicialService = {
    list: vi.fn(async () => [{ id: 'judicial-1' }]),
    create: vi.fn(async () => ({ id: 'judicial-1', requestReference: 'REQ-1' })),
    validateDpo: vi.fn(async (id: string) => ({ id, status: 'validated' })),
    validateLegal: vi.fn(async (id: string) => ({ id, status: 'validated' })),
    reject: vi.fn(async (id: string) => ({ id, status: 'rejected' })),
    execute: vi.fn(async () => ({ exportFingerprint: 'fingerprint', rows: [] })),
    close: vi.fn(async (id: string) => ({ id, status: 'closed' })),
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        QuestionnairesController,
        VersionsController,
        ModerationController,
        RespondentController,
        StatsController,
        AuditController,
        JudicialController,
      ],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: OidcService, useValue: { enabled: vi.fn(() => false), createAuthorizationUrl: vi.fn(), completeAuthorization: vi.fn() } },
        { provide: ConfigService, useValue: { get: vi.fn((_: string, fallback?: string) => fallback) } },
        { provide: QuestionnairesService, useValue: questionnairesService },
        { provide: VersionsService, useValue: versionsService },
        { provide: ModerationService, useValue: moderationService },
        { provide: RespondentService, useValue: respondentService },
        { provide: StatsService, useValue: statsService },
        { provide: AuditService, useValue: auditService },
        { provide: JudicialService, useValue: judicialService },
      ],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest()
          req.user = testUser
          req.authSession = { id: 'session-1', user: testUser }
          return true
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(new ApiExceptionFilter())
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors: ValidationError[]) =>
          new BadRequestException({
            message: toFrenchValidationMessages(errors),
            error: 'Validation des données impossible',
          }),
      }),
    )
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('authenticates and exposes the current session profile', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@chpm.local', password: 'password-123' })
      .expect(201)
      .expect(({ body }) => expect(body.user.email).toBe('admin@chpm.local'))

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.user.role).toBe('admin'))

    expect(authService.login).toHaveBeenCalledWith('admin@chpm.local', 'password-123', expect.anything(), expect.anything())
  })

  it('validates DTOs and returns harmonized API errors', async () => {
    await request(app.getHttpServer())
      .post('/api/questionnaires')
      .send({ code: 'IT', title: 'x', unknown: true })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.details.join(' ')).toContain('unknown')
      })

    await request(app.getHttpServer())
      .get('/api/respondent/session')
      .expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('VALIDATION_ERROR'))
  })

  it('serves questionnaire and version administration contracts', async () => {
    await request(app.getHttpServer())
      .get('/api/questionnaires')
      .expect(200)
      .expect(({ body }) => expect(body.questionnaires).toHaveLength(1))

    await request(app.getHttpServer())
      .post('/api/questionnaires/questionnaire-1/versions')
      .send({ versionLabel: 'v2' })
      .expect(201)
      .expect(({ body }) => expect(body.version.id).toBe('version-1'))

    await request(app.getHttpServer())
      .post('/api/versions/version-1/publish')
      .expect(201)
      .expect(({ body }) => expect(body.version.versionLabel).toBe('v1'))

    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'questionnaire_version.publish' }))
  })

  it('serves invitation, respondent session, answer save and submit contracts', async () => {
    await request(app.getHttpServer())
      .post('/api/moderation/invitations')
      .send({
        questionnaireVersionId: '550e8400-e29b-41d4-a716-446655440000',
        buildingId: '550e8400-e29b-41d4-a716-446655440001',
        email: 'patient@example.org',
        deliveryMode: 'email_simulation',
      })
      .expect(201)
      .expect(({ body }) => expect(body.invitation.publicCode).toBe('CODE-1'))

    await request(app.getHttpServer())
      .get('/api/respondent/session')
      .query({ token: 'signed-token' })
      .expect(200)
      .expect(({ body }) => expect(body.responseSession.id).toBe('session-1'))

    await request(app.getHttpServer())
      .put('/api/respondent/answers')
      .send({
        token: 'signed-token',
        answers: [{ questionId: '550e8400-e29b-41d4-a716-446655440002', value: 3 }],
      })
      .expect(200)
      .expect(({ body }) => expect(body.saved).toBe(1))

    await request(app.getHttpServer())
      .post('/api/respondent/submit')
      .send({ token: 'signed-token' })
      .expect(201)
      .expect(({ body }) => expect(body.submission.id).toBe('submission-1'))
  })

  it('serves stats, audit and judicial-access contracts', async () => {
    await request(app.getHttpServer())
      .get('/api/stats/questionnaires/questionnaire-1')
      .expect(200)
      .expect(({ body }) => expect(body.stats.totals.submitted).toBe(6))

    await request(app.getHttpServer())
      .get('/api/audit-logs?limit=25')
      .expect(200)
      .expect(({ body }) => expect(body.logs).toHaveLength(1))

    await request(app.getHttpServer())
      .post('/api/judicial-access/requests')
      .send({
        requestReference: 'REQ-2026-001',
        legalBasisDescription: 'Réquisition judiciaire reçue et enregistrée.',
        requestedPublicCodes: ['CODE-1'],
        requestedBy: 'Tribunal judiciaire',
      })
      .expect(201)
      .expect(({ body }) => expect(body.judicialRequest.requestReference).toBe('REQ-1'))
  })
})
