import type {
  ApiBuilding,
  ApiInvitation,
  ApiNotificationSubscription,
  ApiQuestionnaire,
  ApiTerminalDevice,
  AuthUserProfile,
  PseudonymizedExportResponse,
  RetentionPolicyResponse,
  StatsResponse,
  SubmissionDetailsResponse,
  TechnicalRegisterResponse,
} from '@shared/types/api'

export const buildingFixture: ApiBuilding = {
  id: 'building-1',
  code: 'A',
  label: 'Bâtiment A',
  city: 'Montfavet',
  country: 'France',
  timezone: 'Europe/Paris',
}

export const adminUserFixture: AuthUserProfile = {
  id: 'user-admin',
  email: 'admin@chpm.local',
  displayName: 'Alice Martin',
  role: 'admin',
  permissions: [
    'questionnaire:configure',
    'questionnaire:publish',
    'statistics:read',
    'notification:configure',
    'terminal:administer',
  ],
  building: null,
}

export const moderatorUserFixture: AuthUserProfile = {
  id: 'user-moderator',
  email: 'moderateur@chpm.local',
  displayName: 'Marc Dubois',
  role: 'moderator',
  permissions: ['questionnaire:preview', 'invitation:create', 'invitation:readScoped'],
  building: buildingFixture,
}

export const questionnaireFixture: ApiQuestionnaire = {
  id: 'questionnaire-1',
  code: 'ITQ',
  title: 'International Trauma Questionnaire',
  description: 'Questionnaire clinique publié',
  defaultLanguage: 'fr',
  versionId: 'version-1',
  version: '1.0.0',
  versionLabel: '1.0',
  language: 'fr',
  finality: 'Coordination clinique',
  status: 'published',
  isPublished: true,
  groupCount: 1,
  questionCount: 1,
  groups: [
    {
      id: 'group-1',
      title: 'Symptômes',
      description: null,
      displayOrder: 1,
      questionsPerPage: 1,
      randomize: false,
      questions: [
        {
          id: 'question-1',
          code: 'P1',
          title: 'Rêves perturbants',
          label: 'Avoir des rêves perturbants ?',
          type: 'likert',
          responseType: 'likert',
          displayOrder: 1,
          answerScaleLabel: '0 à 4',
          isRequired: true,
          likertScale: {
            id: 'scale-1',
            points: 5,
            minValue: 0,
            leftAnchor: 'Pas du tout',
            rightAnchor: 'Extrêmement',
            neutralLabel: 'Modérément',
            allowNotApplicable: false,
            orientation: 'horizontal',
          },
          options: [],
          popupDefinitions: [],
        },
      ],
    },
  ],
}

export const draftQuestionnaireFixture: ApiQuestionnaire = {
  ...questionnaireFixture,
  id: 'questionnaire-draft',
  versionId: 'version-draft',
  status: 'draft',
  isPublished: false,
}

export const terminalDeviceFixture: ApiTerminalDevice = {
  id: 'terminal-1',
  code: 'TERM-A',
  label: 'Tablette accueil',
  status: 'active',
  building: buildingFixture,
  lastSeenAt: null,
  pendingInvitationCount: 2,
}

export const invitationFixture: ApiInvitation = {
  id: 'invitation-1',
  publicCode: 'ITQ-0001',
  status: 'sent',
  deliveryMode: 'email_simulation',
  assistanceMode: 'none',
  maskedEmail: 'p***@example.test',
  maskedPhone: null,
  questionnaireVersionId: 'version-1',
  questionnaireTitle: questionnaireFixture.title,
  versionLabel: '1.0',
  building: buildingFixture,
  terminalDevice: null,
  terminalDispatchedAt: null,
  expiresAt: '2027-01-01T00:00:00.000Z',
  sentAt: '2026-01-01T09:00:00.000Z',
  openedAt: null,
  startedAt: null,
  submittedAt: null,
  responseStatus: null,
}

export const notificationSubscriptionFixture: ApiNotificationSubscription = {
  id: 'subscription-1',
  userId: 'user-admin',
  questionnaireVersionId: 'version-1',
  buildingId: null,
  eventType: 'submission_received',
  channel: 'email',
  frequency: 'daily',
  digestHour: 8,
  isEnabled: true,
  lastDeliveredAt: null,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
  questionnaireVersion: {
    id: 'version-1',
    versionLabel: '1.0',
    questionnaire: { id: 'questionnaire-1', title: questionnaireFixture.title, code: 'ITQ' },
  },
}

export const technicalRegisterFixture: TechnicalRegisterResponse['register'] = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  controller: 'CHPM',
  dpoContact: 'dpo@example.test',
  consultedByRole: 'dpo',
  processing: [
    {
      name: 'Questionnaires',
      finality: 'Coordination clinique',
      lawfulBasis: 'Mission d’intérêt public',
      dataCategories: ['réponses pseudonymisées'],
      recipients: ['équipe autorisée'],
      storage: 'base chiffrée',
      retention: '24 mois',
    },
  ],
  safeguards: ['pseudonymisation', 'audit'],
  jobs: ['expiration des invitations'],
}

export const retentionPolicyFixture: RetentionPolicyResponse['policy'] = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  rules: [{ object: 'invitations', retention: '30 jours', action: 'expire', endpoint: '/compliance/maintenance/expire-invitations' }],
  parameters: { invitationTtlDays: 30 },
  knownLimitations: [],
}

export const pseudonymizedExportFixture: PseudonymizedExportResponse['export'] = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  generatedByRole: 'dpo',
  questionnaire: { id: 'questionnaire-1', code: 'ITQ', title: questionnaireFixture.title },
  rowCount: 1,
  sourceRowCount: 1,
  threshold: 10,
  suppressedByThreshold: false,
  displayValue: '1',
  containsDirectEmail: false,
  containsEmailHash: false,
  containsEncryptedEmail: false,
  identityVaultExcluded: true,
  fingerprint: '0123456789abcdef',
  rows: [
    {
      publicCode: 'ITQ-0001',
      questionnaireId: 'questionnaire-1',
      questionnaireCode: 'ITQ',
      versionId: 'version-1',
      versionLabel: '1.0',
      buildingCode: 'A',
      buildingLabel: 'Bâtiment A',
      submittedAt: '2026-01-01T10:00:00.000Z',
      answerCount: 1,
      telemetryEventCount: 3,
      answers: [{ questionCode: 'P1', responseType: 'likert', value: 2, warning: null }],
    },
  ],
}

export const statsFixture: StatsResponse['stats'] = {
  questionnaire: { id: 'questionnaire-1', code: 'ITQ', title: questionnaireFixture.title },
  threshold: 10,
  totals: {
    invited: 10,
    opened: 8,
    started: 7,
    submitted: 6,
    abandoned: 1,
    expired: 2,
    openingRate: 80,
    startRate: 70,
    submissionRate: 60,
    completionRate: 85.7,
    abandonmentRate: 14.3,
    telemetryEvents: 42,
    popupOpens: 5,
    answerChanges: 8,
    backtracks: 1,
    resumes: 2,
    medianTotalDurationMs: 120_000,
  },
  versions: [],
  deliveryModes: [],
  buildings: [],
  sites: [],
  languages: [],
  popups: [],
  groups: [],
  questions: [],
  submissions: [],
}

export const submissionFixture: SubmissionDetailsResponse['submission'] = {
  publicCode: 'ITQ-0001',
  status: 'submitted',
  submittedAt: '2026-01-01T10:00:00.000Z',
  startedAt: '2026-01-01T09:50:00.000Z',
  totalDurationMs: 600_000,
  answerCount: 1,
  questionnaire: questionnaireFixture.title,
  versionLabel: '1.0',
  building: buildingFixture.label,
  answers: [{ questionCode: 'P1', questionLabel: 'Rêves perturbants', responseType: 'likert', value: 2, warning: null }],
  telemetry: {
    totalEvents: 4,
    popupOpens: 1,
    answerChanges: 1,
    backtracks: 0,
    resumes: 0,
  },
}
