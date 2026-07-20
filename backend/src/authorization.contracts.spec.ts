import { ForbiddenException, INestApplication } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser')
import request from 'supertest'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'

import { AuditController } from './audit/audit.controller'
import { AuditService } from './audit/audit.service'
import { AuthService } from './auth/auth.service'
import type { AuthenticatedSession, AuthenticatedUser } from './auth/auth.types'
import type { UserRole } from './auth/role-permissions'
import { RolesGuard } from './common/guards/roles.guard'
import { SessionAuthGuard } from './common/guards/session-auth.guard'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'
import { IdentityVaultController } from './identity-vault/identity-vault.controller'
import { IdentityVaultService } from './identity-vault/identity-vault.service'
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

function user(role: UserRole): AuthenticatedUser {
  return {
    id: `user-${role}`,
    email: `${role}@chpm.local`,
    displayName: role,
    role,
    organizationId: 'org-1',
    siteId: role === 'site_manager' ? 'site-1' : null,
    buildingId: role === 'moderator' ? 'building-1' : null,
    isActive: true,
    building: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

function sessionFor(role: UserRole): AuthenticatedSession {
  const authenticatedUser = user(role)
  return {
    id: `session-${role}`,
    tokenHash: `hash-${role}`,
    userId: authenticatedUser.id,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
    userAgent: null,
    ipAddress: null,
    user: authenticatedUser,
  }
}

describe('RBAC authorization contracts', () => {
  let app: INestApplication

  const authService = {
    cookieName: 'chpm_session',
    validateSessionToken: vi.fn(async (token: string) => {
      const role = token.replace('token-', '') as UserRole
      return ['admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo', 'judicial_officer', 'technical_admin'].includes(role)
        ? sessionFor(role)
        : null
    }),
  }
  const questionnairesService = {
    listForUser: vi.fn(async () => []),
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
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'version-1', versionLabel: 'v1' })),
    listRules: vi.fn(async () => []),
    createRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    updateRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    archiveRule: vi.fn(async () => ({ id: 'rule-1', code: 'RULE_1' })),
    publish: vi.fn(async () => ({ id: 'version-1', versionLabel: 'v1' })),
  }
  const moderationService = {
    listForUser: vi.fn(async () => []),
    create: vi.fn(async () => ({ invitation: { id: 'invitation-1', publicCode: 'CODE-1' } })),
    resend: vi.fn(async () => ({ invitation: { id: 'invitation-1' } })),
    listTerminalDevices: vi.fn(async () => []),
    registerTerminalDevice: vi.fn(async () => ({ terminalDevice: { id: 'terminal-1' } })),
  }
  const respondentService = {
    getSession: vi.fn(async () => ({ responseSession: { id: 'session-1' }, questionnaire: { groups: [] } })),
    saveAnswers: vi.fn(async () => ({ saved: 1 })),
    recordTelemetry: vi.fn(async () => ({ ok: true })),
    submit: vi.fn(async () => ({ submission: { id: 'submission-1' } })),
  }
  const statsService = {
    questionnaireStats: vi.fn(async () => ({ threshold: 5, totals: { submitted: 5 }, submissions: [] })),
    questionStats: vi.fn(async () => ({ questionnaire: { id: 'q' }, question: { id: 'question-1', code: 'Q1' } })),
    submission: vi.fn(async () => ({ publicCode: 'CODE-1' })),
  }
  const auditService = {
    log: vi.fn(async () => undefined),
    listForUser: vi.fn(async () => []),
  }
  const judicialService = {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'judicial-1' })),
    validateDpo: vi.fn(async () => ({ id: 'judicial-1' })),
    validateLegal: vi.fn(async () => ({ id: 'judicial-1' })),
    reject: vi.fn(async () => ({ id: 'judicial-1' })),
    execute: vi.fn(async () => ({ judicialRequest: { id: 'judicial-1', status: 'executed' }, export: { envelope: 'encrypted' } })),
    close: vi.fn(async () => ({ id: 'judicial-1' })),
  }
  const identityVaultService = {
    status: vi.fn(async () => ({ directEmailVisibleInAdmin: false })),
    recordAccessAttempt: vi.fn(async () => {
      throw new ForbiddenException('Accès identité interdit depuis l’API principale')
    }),
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      controllers: [
        QuestionnairesController,
        VersionsController,
        ModerationController,
        RespondentController,
        StatsController,
        AuditController,
        JudicialController,
        IdentityVaultController,
      ],
      providers: [
        Reflector,
        SessionAuthGuard,
        RolesGuard,
        { provide: AuthService, useValue: authService },
        { provide: QuestionnairesService, useValue: questionnairesService },
        { provide: VersionsService, useValue: versionsService },
        { provide: ModerationService, useValue: moderationService },
        { provide: RespondentService, useValue: respondentService },
        { provide: StatsService, useValue: statsService },
        { provide: AuditService, useValue: auditService },
        { provide: JudicialService, useValue: judicialService },
        { provide: IdentityVaultService, useValue: identityVaultService },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.use(cookieParser())
    app.setGlobalPrefix('api')
    app.useGlobalFilters(new ApiExceptionFilter())
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  function getAs(role: UserRole, path: string) {
    return request(app.getHttpServer()).get(path).set('Cookie', `chpm_session=token-${role}`)
  }

  function postAs(role: UserRole, path: string) {
    return request(app.getHttpServer()).post(path).set('Cookie', `chpm_session=token-${role}`)
  }

  it('refuses protected endpoints without a valid server session and leaves respondent token endpoints public', async () => {
    await request(app.getHttpServer()).get('/api/questionnaires').expect(401)
    await request(app.getHttpServer()).get('/api/respondent/session').query({ token: 'respondent-token' }).expect(200)
  })

  it('allows and refuses questionnaire administration by explicit role', async () => {
    await postAs('questionnaire_admin', '/api/questionnaires').send({ code: 'ITQ', title: 'Questionnaire ITQ' }).expect(201)
    await postAs('moderator', '/api/questionnaires').send({ code: 'ITQ', title: 'Questionnaire ITQ' }).expect(403)
  })

  it('prevents a moderator from reading pseudonymized submission details', async () => {
    await getAs('analyst', '/api/stats/submissions/CODE-1').expect(200)
    await getAs('moderator', '/api/stats/submissions/CODE-1').expect(403)
  })

  it('prevents analysts and project admins from creating invitations', async () => {
    await postAs('moderator', '/api/moderation/invitations').send({}).expect(201)
    await postAs('site_manager', '/api/moderation/invitations').send({}).expect(201)
    await postAs('analyst', '/api/moderation/invitations').send({}).expect(403)
    await postAs('admin', '/api/moderation/invitations').send({}).expect(403)
  })

  it('prevents direct email-vault access from business and legal roles through the main API', async () => {
    await postAs('admin', '/api/identity-vault/access-attempt').send({ publicCode: 'ABCD-1234', justification: 'Tentative directe hors procédure judiciaire.' }).expect(403)
    await postAs('judicial_officer', '/api/identity-vault/access-attempt').send({ publicCode: 'ABCD-1234', justification: 'Routage vers procédure judiciaire validée.' }).expect(403)
    await postAs('dpo', '/api/identity-vault/access-attempt').send({ publicCode: 'ABCD-1234', justification: 'Tentative DPO via API métier.' }).expect(403)
  })

  it('allows encrypted execution only to the DPO role', async () => {
    await postAs('dpo', '/api/judicial-access/requests/judicial-1/execute').expect(201)
    await postAs('judicial_officer', '/api/judicial-access/requests/judicial-1/execute').expect(403)
  })

  it('keeps audit logs restricted to control roles', async () => {
    await getAs('technical_admin', '/api/audit-logs').expect(200)
    await getAs('moderator', '/api/audit-logs').expect(403)
  })
})
