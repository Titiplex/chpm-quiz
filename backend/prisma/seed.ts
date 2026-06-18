import { createCipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const respondentTokenSecret = process.env.RESPONDENT_TOKEN_SECRET ?? 'dev-respondent-token-secret-change-me'
const emailEncryptionSecret = process.env.DEV_EMAIL_ENCRYPTION_SECRET ?? 'development-email-key-change-me'
const emailHashPepper = process.env.EMAIL_HASH_PEPPER ?? process.env.DEV_EMAIL_HASH_PEPPER ?? 'development-email-pepper-change-me'

type UserRole =
  | 'admin'
  | 'moderator'
  | 'site_manager'
  | 'questionnaire_admin'
  | 'analyst'
  | 'dpo'
  | 'judicial_officer'
  | 'technical_admin'

type QuestionType = 'single_choice' | 'multiple_choice' | 'likert' | 'free_text' | 'free_text_short' | 'free_text_long' | 'number' | 'date' | 'information'

const userSeeds: Array<{
  email: string
  password: string
  displayName: string
  role: UserRole
  buildingCode?: string
  siteCode?: string
}> = [
  {
    email: 'admin@chpm.local',
    password: 'Admin123!',
    displayName: 'Alice Martin',
    role: 'admin',
  },
  {
    email: 'moderateur@chpm.local',
    password: 'Moderator123!',
    displayName: 'Marc Dubois',
    role: 'moderator',
    buildingCode: 'MTL-A',
    siteCode: 'MTL',
  },
  {
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    displayName: 'Nadia Bernard',
    role: 'analyst',
  },
  {
    email: 'dpo@chpm.local',
    password: 'Dpo12345!',
    displayName: 'Claire DPO',
    role: 'dpo',
  },
  {
    email: 'judiciaire@chpm.local',
    password: 'Judiciaire123!',
    displayName: 'Julie Accès judiciaire',
    role: 'judicial_officer',
  },
  {
    email: 'tech@chpm.local',
    password: 'Tech12345!',
    displayName: 'Thomas Technique',
    role: 'technical_admin',
  },
]

async function main() {
  await cleanup()

  const organization = await prisma.organization.upsert({
    where: { code: 'CHPM' },
    update: { name: 'Centre Hospitalier de Montfavet' },
    create: { code: 'CHPM', name: 'Centre Hospitalier de Montfavet' },
  })

  const sites = await Promise.all([
    prisma.site.upsert({
      where: { code: 'MTL' },
      update: { name: 'Montréal', country: 'Canada', timezone: 'America/Montreal', organizationId: organization.id },
      create: { code: 'MTL', name: 'Montréal', country: 'Canada', timezone: 'America/Montreal', organizationId: organization.id },
    }),
    prisma.site.upsert({
      where: { code: 'PAR' },
      update: { name: 'Paris', country: 'France', timezone: 'Europe/Paris', organizationId: organization.id },
      create: { code: 'PAR', name: 'Paris', country: 'France', timezone: 'Europe/Paris', organizationId: organization.id },
    }),
    prisma.site.upsert({
      where: { code: 'TYO' },
      update: { name: 'Tokyo', country: 'Japon', timezone: 'Asia/Tokyo', organizationId: organization.id },
      create: { code: 'TYO', name: 'Tokyo', country: 'Japon', timezone: 'Asia/Tokyo', organizationId: organization.id },
    }),
  ])

  const siteByCode = new Map(sites.map((site) => [site.code, site]))

  const buildings = await Promise.all([
    building('MTL-A', 'Montréal · Bâtiment A', 'Montréal', 'Canada', 'America/Montreal', organization.id, siteByCode.get('MTL')!.id),
    building('PAR-C', 'Paris · Bâtiment C', 'Paris', 'France', 'Europe/Paris', organization.id, siteByCode.get('PAR')!.id),
    building('TYO-H', 'Tokyo · Bâtiment H', 'Tokyo', 'Japon', 'Asia/Tokyo', organization.id, siteByCode.get('TYO')!.id),
  ])

  const buildingByCode = new Map(buildings.map((item) => [item.code, item]))

  const users = []
  for (const seed of userSeeds) {
    const passwordHash = await bcrypt.hash(seed.password, 12)
    const buildingRecord = seed.buildingCode ? buildingByCode.get(seed.buildingCode) : undefined
    const siteRecord = seed.siteCode ? siteByCode.get(seed.siteCode) : undefined

    users.push(
      await prisma.user.upsert({
        where: { email: seed.email },
        update: {
          passwordHash,
          displayName: seed.displayName,
          role: seed.role,
          isActive: true,
          organizationId: organization.id,
          siteId: siteRecord?.id ?? buildingRecord?.siteId ?? null,
          buildingId: buildingRecord?.id ?? null,
        },
        create: {
          email: seed.email,
          passwordHash,
          displayName: seed.displayName,
          role: seed.role,
          isActive: true,
          organizationId: organization.id,
          siteId: siteRecord?.id ?? buildingRecord?.siteId,
          buildingId: buildingRecord?.id,
        },
      }),
    )
  }

  const admin = users.find((user) => user.email === 'admin@chpm.local')!
  const moderator = users.find((user) => user.email === 'moderateur@chpm.local')!

  const questionnaire = await prisma.questionnaire.create({
    data: {
      organizationId: organization.id,
      ownerUserId: admin.id,
      code: 'CHPM-BASE',
      title: 'Questionnaire CHPM',
      description: 'Questionnaire adaptatif de compréhension et de retour d’expérience.',
      defaultLanguage: 'fr',
      finality: 'Mesurer la compréhension des formulations métier et identifier les zones d’ambiguïté.',
      status: 'published',
    },
  })

  const coordinationTerm = await prisma.glossaryTerm.create({
    data: {
      termKey: 'coordination_inter_site',
      language: 'fr',
      label: 'Coordination inter-site',
      definition: 'Capacité des équipes de bâtiments ou sites différents à partager les informations nécessaires au bon déroulement du parcours.',
      version: '1.0',
    },
  })

  const publishedVersion = await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      versionLabel: '1.4',
      language: 'fr',
      status: 'published',
      description: 'Version publiée de démonstration reliée au workflow répondant.',
      finality: questionnaire.finality,
      openFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      openUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      immutableAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      groups: {
        create: [
          {
            title: 'Accueil',
            description: 'Consentement, langue et contexte de passation.',
            displayOrder: 1,
            questionsPerPage: 2,
            randomize: false,
            questions: {
              create: [
                question('Q-001', 1, 'Langue de passation souhaitée / Preferred language', 'single_choice', true, 'Votre choix pilote automatiquement les groupes de questions affichés ensuite.', [
                  ['fr', 'Français'],
                  ['en', 'English'],
                ]),
                question('Q-002', 2, 'Confirmez-vous pouvoir répondre maintenant ?', 'single_choice', true, 'Permet de reporter la passation si nécessaire.', [
                  ['yes', 'Oui'],
                  ['no', 'Non'],
                ]),
              ],
            },
          },
          {
            title: 'Questions françaises',
            description: 'Groupe conditionnel affiché uniquement si la première question vaut “Français”. Les questions sont mélangées de manière stable pour chaque session.',
            displayOrder: 2,
            questionsPerPage: 3,
            randomize: true,
            conditionExpression: { questionCode: 'Q-001', operator: 'equals', value: 'fr' },
            questions: {
              create: [
                {
                  code: 'Q-014',
                  displayOrder: 1,
                  label: 'Le terme “coordination inter-site” est-il clair pour vous ?',
                  responseType: 'likert',
                  isRequired: true,
                  helperText: 'Cette question mesure la compréhension du vocabulaire employé.',
                  tags: ['comprehension', 'popup'],
                  likertScale: {
                    create: {
                      points: 7,
                      leftAnchor: 'Pas du tout clair',
                      rightAnchor: 'Très clair',
                      neutralLabel: 'Ni clair ni pas clair',
                      allowNotApplicable: false,
                    },
                  },
                  popupDefinitions: {
                    create: {
                      glossaryTermId: coordinationTerm.id,
                      termKey: 'coordination_inter_site',
                      language: 'fr',
                      title: 'Coordination inter-site',
                      body: coordinationTerm.definition,
                      version: '1.0',
                    },
                  },
                },
                question('Q-015', 2, 'Qu’est-ce qui rendrait cette formulation plus facile à comprendre ?', 'free_text_long', false, 'Évitez de saisir des noms, emails ou informations directement identifiantes.'),
                question('Q-016', 3, 'Le parcours présenté vous semble-t-il cohérent ?', 'likert', true, 'Échelle de cohérence perçue.', undefined, {
                  points: 5,
                  leftAnchor: 'Pas cohérent',
                  rightAnchor: 'Très cohérent',
                  neutralLabel: 'Neutre',
                }),
              ],
            },
          },
          {
            title: 'English questions',
            description: 'Conditional group displayed only when the language answer is “English”. Question order is stable-randomized per respondent session.',
            displayOrder: 3,
            questionsPerPage: 3,
            randomize: true,
            conditionExpression: { questionCode: 'Q-001', operator: 'equals', value: 'en' },
            questions: {
              create: [
                {
                  code: 'Q-014-EN',
                  displayOrder: 1,
                  label: 'Is the term “cross-site coordination” clear to you?',
                  responseType: 'likert',
                  isRequired: true,
                  helperText: 'This question measures whether the business wording is understood.',
                  tags: ['comprehension', 'popup', 'en'],
                  likertScale: {
                    create: {
                      points: 7,
                      leftAnchor: 'Not clear at all',
                      rightAnchor: 'Very clear',
                      neutralLabel: 'Neither clear nor unclear',
                      allowNotApplicable: false,
                    },
                  },
                  popupDefinitions: {
                    create: {
                      termKey: 'cross_site_coordination',
                      language: 'en',
                      title: 'Cross-site coordination',
                      body: 'The ability of teams working in different buildings or sites to share information needed for a smooth process.',
                      version: '1.0',
                    },
                  },
                },
                question('Q-015-EN', 2, 'What would make this wording easier to understand?', 'free_text_long', false, 'Avoid entering names, emails or directly identifying details.'),
                question('Q-016-EN', 3, 'Does the proposed pathway seem coherent to you?', 'likert', true, 'Perceived coherence scale.', undefined, {
                  points: 5,
                  leftAnchor: 'Not coherent',
                  rightAnchor: 'Very coherent',
                  neutralLabel: 'Neutral',
                }),
              ],
            },
          },
          {
            title: 'Commentaires libres / Free comments',
            description: 'Synthèse qualitative finale, affichée après le choix de langue.',
            displayOrder: 4,
            questionsPerPage: 1,
            randomize: false,
            conditionExpression: { any: [
              { questionCode: 'Q-001', operator: 'equals', value: 'fr' },
              { questionCode: 'Q-001', operator: 'equals', value: 'en' },
            ] },
            questions: {
              create: [
                question('Q-027', 1, 'Décrivez les difficultés rencontrées pendant le test / Describe any difficulties encountered during the test.', 'free_text_long', false, 'Champ libre sauvegardé en brouillon avant soumission. Avoid directly identifying details.'),
              ],
            },
          },
        ],
      },
      conditionalRules: {
        create: [
          {
            code: 'LANG-FR',
            priority: 10,
            trigger: { questionCode: 'Q-001', operator: 'equals', value: 'fr' },
            effect: { action: 'set_language', language: 'fr' },
          },
          {
            code: 'LANG-EN',
            priority: 11,
            trigger: { questionCode: 'Q-001', operator: 'equals', value: 'en' },
            effect: { action: 'set_language', language: 'en' },
          },
        ],
      },
    },
  })

  await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      versionLabel: '1.5-draft',
      language: 'fr',
      status: 'draft',
      description: 'Brouillon éditable : une publication créera une version immutable.',
      finality: questionnaire.finality,
    },
  })

  const itqVersion = await createItqQuestionnaire(organization.id, admin.id)

  const pilot = await prisma.questionnaire.create({
    data: {
      organizationId: organization.id,
      ownerUserId: admin.id,
      code: 'CHPM-PILOT',
      title: 'Questionnaire pilote',
      description: 'Questionnaire brouillon non diffusé.',
      defaultLanguage: 'fr',
      status: 'draft',
    },
  })

  await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: pilot.id,
      versionLabel: '0.9',
      language: 'fr',
      status: 'draft',
      groups: {
        create: [
          {
            title: 'Pilote',
            displayOrder: 1,
            questionsPerPage: 1,
            questions: {
              create: [question('P-001', 1, 'Question pilote de validation', 'information', false, 'Visible uniquement pour les administrateurs.')],
            },
          },
        ],
      },
    },
  })

  await createDemoInvitations(publishedVersion.id, moderator.id, buildingByCode.get('MTL-A')!.id, buildingByCode.get('MTL-A')!.siteId)
  const itqDemoToken = await createSeedInvitation(
    itqVersion.id,
    moderator.id,
    buildingByCode.get('MTL-A')!.id,
    buildingByCode.get('MTL-A')!.siteId,
    'ITQ-0001',
    'itq.demo@example.org',
  )


  await prisma.notificationSubscription.createMany({
    data: [
      {
        userId: admin.id,
        questionnaireVersionId: publishedVersion.id,
        eventType: 'submission_received',
        channel: 'email',
        frequency: 'immediate',
        digestHour: 8,
        isEnabled: true,
      },
      {
        userId: moderator.id,
        questionnaireVersionId: publishedVersion.id,
        buildingId: buildingByCode.get('MTL-A')!.id,
        eventType: 'submission_received',
        channel: 'internal',
        frequency: 'daily',
        digestHour: 9,
        isEnabled: true,
      },
      {
        userId: admin.id,
        questionnaireVersionId: itqVersion.id,
        eventType: 'submission_received',
        channel: 'email',
        frequency: 'daily',
        digestHour: 8,
        isEnabled: true,
      },
    ],
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: 'seed.bootstrap',
      entityType: 'System',
      metadata: { version: 'cdc-aligned-demo' },
    },
  })

  console.log('Seed terminé. Comptes internes de démonstration :')
  for (const user of userSeeds) {
    console.log(`- ${user.email} / ${user.password}`)
  }
  console.log('Le répondant utilise désormais un lien /r/<token> généré par la modération, pas un compte interne.')
  console.log(`Questionnaire ITQ seedé : version publiée, 20 écrans dont 18 items cotés, 1 question par page, bulles d’information activées.`)
  console.log(`Lien répondant ITQ de démonstration : /r/${itqDemoToken}`)
}

async function cleanup() {
  await prisma.auditLog.deleteMany()
  await prisma.identityVaultAuditLog.deleteMany()
  await prisma.emailDeliveryEvent.deleteMany()
  await prisma.identityVaultEntry.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.telemetryEvent.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.responseSession.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.notificationSubscription.deleteMany()
  await prisma.judicialAccessRequest.deleteMany()
  await prisma.session.deleteMany()
  await prisma.conditionalRule.deleteMany()
  await prisma.popupDefinition.deleteMany()
  await prisma.glossaryTerm.deleteMany()
  await prisma.likertScale.deleteMany()
  await prisma.answerOption.deleteMany()
  await prisma.question.deleteMany()
  await prisma.questionGroup.deleteMany()
  await prisma.questionnaireVersion.deleteMany()
  await prisma.questionnaire.deleteMany()
  await prisma.user.deleteMany()
  await prisma.building.deleteMany()
  await prisma.site.deleteMany()
  await prisma.organization.deleteMany()
}

async function building(code: string, label: string, city: string, country: string, timezone: string, organizationId: string, siteId: string) {
  return prisma.building.upsert({
    where: { code },
    update: { label, city, country, timezone, organizationId, siteId },
    create: { code, label, city, country, timezone, organizationId, siteId },
  })
}

function question(
  code: string,
  displayOrder: number,
  label: string,
  responseType: QuestionType,
  isRequired: boolean,
  helperText?: string,
  options?: Array<[string, string]>,
  likertScale?: { points: number; minValue?: number; leftAnchor: string; rightAnchor: string; neutralLabel?: string },
) {
  return {
    code,
    displayOrder,
    label,
    responseType,
    isRequired,
    helperText,
    tags: [],
    ...(options
      ? {
          answerOptions: {
            create: options.map(([value, optionLabel], index) => ({
              value,
              label: optionLabel,
              displayOrder: index + 1,
            })),
          },
        }
      : {}),
    ...(likertScale
      ? {
          likertScale: {
            create: {
              ...likertScale,
              minValue: likertScale.minValue ?? 1,
              allowNotApplicable: false,
            },
          },
        }
      : {}),
  }
}


async function createItqQuestionnaire(organizationId: string, ownerUserId: string) {
  const itqLikert = {
    points: 5,
    minValue: 0,
    leftAnchor: 'Pas du tout',
    rightAnchor: 'Extrêmement',
    neutralLabel: 'Modérément',
  }

  const itqScaleHelper = 'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement.'
  const ptsdDistressInstruction = `${itqScaleHelper} Indiquez à quel point vous avez été perturbé par ce problème le mois dernier.`
  const dsoTruthInstruction = `${itqScaleHelper} Répondez à quel point l’énoncé est vrai vous concernant.`

  const questionnaire = await prisma.questionnaire.create({
    data: {
      organizationId,
      ownerUserId,
      code: 'ITQ-CN2R',
      title: 'International Trauma Questionnaire (ITQ)',
      description:
        'Version française de l’International Trauma Questionnaire : auto-questionnaire adulte lié au TSPT et au TSPT complexe selon la CIM-11. Seed de démonstration, une question par page.',
      defaultLanguage: 'fr',
      finality:
        'Questionnaire d’auto-évaluation. Le seed structure les items et la cotation 0–4 ; il ne remplace pas une interprétation clinique qualifiée.',
      status: 'published',
    },
  })

  const version = await prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      versionLabel: '1.0-cn2r',
      language: 'fr',
      status: 'published',
      description:
        'ITQ VF Cn2r : 18 items cotés P1–P9 et C1–C9, précédés de deux questions de contexte. Tous les groupes sont configurés à 1 question par page.',
      finality: questionnaire.finality,
      openFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      openUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(),
      immutableAt: new Date(),
      groups: {
        create: [
          {
            title: 'Contexte de l’expérience',
            description:
              'Merci d’indiquer quelle est l’expérience qui vous perturbe le plus et de répondre aux questions par rapport à cette expérience.',
            displayOrder: 1,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'ITQ-EXP-DESC',
                  1,
                  'Description de l’expérience',
                  'free_text_long',
                  false,
                  'Champ libre de contexte. Évitez les noms, emails, téléphones ou toute autre information directement identifiante.',
                ),
                question(
                  'ITQ-EXP-DATE',
                  2,
                  'Quand l’expérience s’est-elle passée ?',
                  'single_choice',
                  true,
                  'Sélectionnez la période la plus proche.',
                  [
                    ['moins_6_mois', 'Il y a moins de 6 mois'],
                    ['6_12_mois', '6 à 12 mois'],
                    ['1_5_ans', '1 à 5 ans'],
                    ['5_10_ans', '5 à 10 ans'],
                    ['10_20_ans', '10 à 20 ans'],
                    ['plus_20_ans', 'Il y a plus de 20 ans'],
                  ],
                ),
              ],
            },
          },
          {
            title: 'TSPT · Symptômes du dernier mois',
            description:
              'Merci de lire chaque item attentivement, puis d’indiquer à quel point vous avez été perturbé par ce problème le mois dernier.',
            displayOrder: 2,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'P1',
                  1,
                  'Avoir des rêves perturbants où se rejoue une partie de l’expérience ou qui sont clairement en relation avec l’expérience ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P2',
                  2,
                  'Avoir des images ou des souvenirs forts qui viennent à l’esprit comme si l’expérience se rejoue ici et maintenant ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P3',
                  3,
                  'Éviter les ressentis qui rappellent l’expérience, par exemple pensées, sentiments ou sensations physiques ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P4',
                  4,
                  'Éviter les éléments extérieurs qui rappellent l’expérience, par exemple personnes, lieux, conversations, objets, activités ou situations ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P5',
                  5,
                  'Être en état de super-alerte, vigilance ou sur ses gardes ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P6',
                  6,
                  'Réaction exagérée de surprise ou sursaut ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
              ],
            },
          },
          {
            title: 'TSPT · Retentissement fonctionnel',
            description: 'Au cours du dernier mois, les symptômes ci-dessus ont-ils affecté votre fonctionnement ?',
            displayOrder: 3,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'P7',
                  1,
                  'Est-ce que cela a affecté vos relations et votre vie sociale ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P8',
                  2,
                  'Est-ce que cela a affecté votre travail ou votre capacité à travailler ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'P9',
                  3,
                  'Est-ce que cela a affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?',
                  'likert',
                  true,
                  ptsdDistressInstruction,
                  undefined,
                  itqLikert,
                ),
              ],
            },
          },
          {
            title: 'Perturbations dans l’organisation de soi',
            description:
              'Les questions suivantes se rapportent à la manière dont vous vous sentez typiquement, pensez de vous-même typiquement, ou êtes typiquement en relation avec les autres.',
            displayOrder: 4,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'C1',
                  1,
                  'Quand je suis contrarié.e, il me faut beaucoup de temps pour me calmer',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'C2',
                  2,
                  'Je me sens insensible ou émotionnellement éteint.e',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
                question('C3', 3, 'Je me sens nul.le', 'likert', true, dsoTruthInstruction, undefined, itqLikert),
                question('C4', 4, 'Je me sens sans valeur', 'likert', true, dsoTruthInstruction, undefined, itqLikert),
                question('C5', 5, 'Je me sens distant.e ou coupé.e des autres', 'likert', true, dsoTruthInstruction, undefined, itqLikert),
                question(
                  'C6',
                  6,
                  'Je trouve qu’il est difficile de rester émotionnellement proche des autres',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
              ],
            },
          },
          {
            title: 'Perturbations dans l’organisation de soi · Retentissement fonctionnel',
            description:
              'Au cours du dernier mois, les problèmes ci-dessus relatifs à vos émotions, aux croyances sur vous-même et dans vos relations ont-ils eu un retentissement ?',
            displayOrder: 5,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'C7',
                  1,
                  'Créé de l’inquiétude ou de la détresse concernant vos relations ou votre vie sociale ?',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'C8',
                  2,
                  'Affecté votre travail ou capacité à travailler ?',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
                question(
                  'C9',
                  3,
                  'Affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?',
                  'likert',
                  true,
                  dsoTruthInstruction,
                  undefined,
                  itqLikert,
                ),
              ],
            },
          },
        ],
      },
    },
  })

  await attachItqPopups(version.id)

  return version
}

async function attachItqPopups(questionnaireVersionId: string) {
  const popupsByQuestionCode: Record<string, Array<{ termKey: string; title: string; body: string }>> = {
    'ITQ-EXP-DESC': [
      {
        termKey: 'experience_perturbante',
        title: 'Expérience qui perturbe le plus',
        body:
          'Dans l’ITQ, les réponses doivent être données par rapport à l’expérience stressante ou traumatique qui vous perturbe le plus. Évitez d’indiquer des noms, emails, téléphones ou détails directement identifiants.',
      },
    ],
    'ITQ-EXP-DATE': [
      {
        termKey: 'periode_experience',
        title: 'Période de l’expérience',
        body:
          'Cette question situe approximativement l’ancienneté de l’expérience. Choisissez la période la plus proche, sans ajouter de date précise si elle permettrait de vous identifier.',
      },
    ],
    'P1': [
      {
        termKey: 'reves_perturbants_revivre_experience',
        title: 'Rêves perturbants · Revivre l’expérience',
        body:
          'Cet item fait partie de la dimension “Revivre l’expérience” de l’ITQ. Il concerne les rêves perturbants où une partie de l’expérience se rejoue ou qui sont clairement en relation avec elle.',
      },
    ],
    'P2': [
      {
        termKey: 'images_souvenirs_revivre_experience',
        title: 'Images ou souvenirs forts · Revivre l’expérience',
        body:
          'Cet item fait partie de la dimension “Revivre l’expérience”. Il vise les images ou souvenirs intenses qui surviennent comme si l’expérience se rejouait ici et maintenant.',
      },
    ],
    'P3': [
      {
        termKey: 'evitement_ressentis',
        title: 'Éviter les ressentis · Évitement',
        body:
          'Cet item fait partie de la dimension “Évitement”. Il concerne l’évitement de rappels internes de l’expérience, par exemple pensées, sentiments ou sensations physiques.',
      },
    ],
    'P4': [
      {
        termKey: 'evitement_elements_exterieurs',
        title: 'Éléments extérieurs · Évitement',
        body:
          'Cet item fait partie de la dimension “Évitement”. Il concerne l’évitement de rappels extérieurs, par exemple personnes, lieux, conversations, objets, activités ou situations.',
      },
    ],
    'P5': [
      {
        termKey: 'super_alerte_vigilance_menace',
        title: 'Super-alerte / vigilance · Sentiment de menace',
        body:
          'Cet item fait partie de la dimension “Sentiments de menace”. Il correspond au fait de rester en hypervigilance, sur ses gardes ou en état de super-alerte.',
      },
    ],
    'P6': [
      {
        termKey: 'sursaut_menace',
        title: 'Sursaut · Sentiment de menace',
        body:
          'Cet item fait partie de la dimension “Sentiments de menace”. Il concerne les réactions de surprise ou de sursaut exagérées.',
      },
    ],
    'P7': [
      {
        termKey: 'alteration_fonctionnelle_relations_tspt',
        title: 'Relations et vie sociale · Retentissement',
        body:
          'Cet item évalue l’altération fonctionnelle associée aux symptômes de TSPT : impact sur les relations et la vie sociale au cours du dernier mois.',
      },
    ],
    'P8': [
      {
        termKey: 'alteration_fonctionnelle_travail_tspt',
        title: 'Travail ou capacité à travailler · Retentissement',
        body:
          'Cet item évalue l’altération fonctionnelle associée aux symptômes de TSPT : impact sur le travail ou la capacité à travailler au cours du dernier mois.',
      },
    ],
    'P9': [
      {
        termKey: 'alteration_fonctionnelle_activites_tspt',
        title: 'Autres activités importantes · Retentissement',
        body:
          'Cet item évalue l’altération fonctionnelle associée aux symptômes de TSPT : impact sur les enfants, les études ou d’autres activités importantes.',
      },
    ],
    'C1': [
      {
        termKey: 'regulation_emotionnelle_calme',
        title: 'Régulation émotionnelle',
        body:
          'Cet item fait partie de la dimension “Régulation émotionnelle” des perturbations dans l’organisation de soi. Il concerne la difficulté à retrouver son calme lorsqu’on est contrarié.',
      },
    ],
    'C2': [
      {
        termKey: 'regulation_emotionnelle_insensibilite',
        title: 'Insensibilité émotionnelle · Régulation émotionnelle',
        body:
          'Cet item fait partie de la dimension “Régulation émotionnelle”. Il concerne le fait de se sentir insensible ou émotionnellement éteint.',
      },
    ],
    'C3': [
      {
        termKey: 'perception_soi_negative_nul',
        title: 'Perception de soi négative',
        body:
          'Cet item fait partie de la dimension “Perception de soi négative” des perturbations dans l’organisation de soi. Il concerne le fait de se sentir nul.le.',
      },
    ],
    'C4': [
      {
        termKey: 'perception_soi_negative_sans_valeur',
        title: 'Sans valeur · Perception de soi négative',
        body:
          'Cet item fait partie de la dimension “Perception de soi négative”. Il concerne le fait de se sentir sans valeur.',
      },
    ],
    'C5': [
      {
        termKey: 'relations_distance_coupure',
        title: 'Distance avec les autres · Relations',
        body:
          'Cet item fait partie de la dimension “Déficit dans les relations”. Il concerne le sentiment d’être distant.e ou coupé.e des autres.',
      },
    ],
    'C6': [
      {
        termKey: 'relations_proximite_emotionnelle',
        title: 'Proximité émotionnelle · Relations',
        body:
          'Cet item fait partie de la dimension “Déficit dans les relations”. Il concerne la difficulté à rester émotionnellement proche des autres.',
      },
    ],
    'C7': [
      {
        termKey: 'alteration_fonctionnelle_relations_pos',
        title: 'Retentissement relationnel · POS',
        body:
          'Cet item évalue l’altération fonctionnelle liée aux perturbations dans l’organisation de soi : inquiétude ou détresse concernant les relations ou la vie sociale.',
      },
    ],
    'C8': [
      {
        termKey: 'alteration_fonctionnelle_travail_pos',
        title: 'Retentissement professionnel · POS',
        body:
          'Cet item évalue l’altération fonctionnelle liée aux perturbations dans l’organisation de soi : impact sur le travail ou la capacité à travailler.',
      },
    ],
    'C9': [
      {
        termKey: 'alteration_fonctionnelle_activites_pos',
        title: 'Retentissement sur les activités · POS',
        body:
          'Cet item évalue l’altération fonctionnelle liée aux perturbations dans l’organisation de soi : impact sur les enfants, les études ou d’autres activités importantes.',
      },
    ],
  }

  const questions = await prisma.question.findMany({
    where: { group: { questionnaireVersionId } },
    select: { id: true, code: true },
  })

  for (const question of questions) {
    const popups = popupsByQuestionCode[question.code] ?? []

    for (const popup of popups) {
      const glossaryTerm = await prisma.glossaryTerm.upsert({
        where: {
          termKey_language_version: {
            termKey: popup.termKey,
            language: 'fr',
            version: '1.0',
          },
        },
        update: {
          label: popup.title,
          definition: popup.body,
          isArchived: false,
        },
        create: {
          termKey: popup.termKey,
          language: 'fr',
          label: popup.title,
          definition: popup.body,
          version: '1.0',
        },
      })

      await prisma.popupDefinition.create({
        data: {
          questionId: question.id,
          glossaryTermId: glossaryTerm.id,
          termKey: popup.termKey,
          language: 'fr',
          title: popup.title,
          body: popup.body,
          version: '1.0',
        },
      })
    }
  }
}

async function createSeedInvitation(
  questionnaireVersionId: string,
  moderatorId: string,
  buildingId: string,
  siteId: string,
  publicCode: string,
  email: string,
) {
  const token = createRespondentToken(publicCode)

  await prisma.invitation.create({
    data: {
      questionnaireVersionId,
      buildingId,
      siteId,
      createdByUserId: moderatorId,
      publicCode,
      tokenHash: sha256(token),
      status: 'sent',
      notifyModerator: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sentAt: new Date(),
      identityVaultEntry: {
        create: {
          uniqueCode: publicCode,
          encryptedEmail: encryptEmail(email),
          emailHash: hashEmail(email),
          questionnaireVersionId,
          buildingId,
          createdByUserId: moderatorId,
          lastEmailSentAt: new Date(),
        },
      },
      deliveryEvents: {
        create: {
          publicCode,
          eventType: 'dev_link_created',
          metadata: { seeded: true, accessLink: `/r/${token}` },
        },
      },
    },
  })

  return token
}

async function createDemoInvitations(questionnaireVersionId: string, moderatorId: string, buildingId: string, siteId: string) {
  const questions = await prisma.question.findMany({
    where: {
      group: {
        questionnaireVersionId,
      },
    },
    include: {
      popupDefinitions: true,
    },
    orderBy: { code: 'asc' },
  })
  const q001 = questions.find((question) => question.code === 'Q-001')!
  const q002 = questions.find((question) => question.code === 'Q-002')!
  const q014 = questions.find((question) => question.code === 'Q-014')!
  const q015 = questions.find((question) => question.code === 'Q-015')!
  const q016 = questions.find((question) => question.code === 'Q-016')!
  const q027 = questions.find((question) => question.code === 'Q-027')!

  for (let index = 0; index < 6; index += 1) {
    const publicCode = index === 0 ? '8F4K-29QX' : `DEMO-${String(index + 1).padStart(4, '0')}`
    const token = createRespondentToken(publicCode)
    const submittedAt = new Date(Date.now() - (6 - index) * 36 * 60 * 60 * 1000)
    const email = `repondant.demo.${index + 1}@example.org`
    const invitation = await prisma.invitation.create({
      data: {
        questionnaireVersionId,
        buildingId,
        siteId,
        createdByUserId: moderatorId,
        publicCode,
        tokenHash: sha256(token),
        status: 'submitted',
        notifyModerator: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        openedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        submittedAt,
        identityVaultEntry: {
          create: {
            uniqueCode: publicCode,
            encryptedEmail: encryptEmail(email),
            emailHash: hashEmail(email),
            questionnaireVersionId,
            buildingId,
            createdByUserId: moderatorId,
            lastEmailSentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          },
        },
        deliveryEvents: {
          create: {
            publicCode,
            eventType: 'dev_link_created',
            metadata: { seeded: true },
          },
        },
      },
    })

    const session = await prisma.responseSession.create({
      data: {
        invitationId: invitation.id,
        publicCode,
        questionnaireVersionId,
        buildingId,
        status: 'locked',
        currentPage: 3,
        randomizationSeed: randomBytes(16).toString('hex'),
        pathFingerprint: sha256(`${publicCode}:path`),
        submittedAt,
        lockedAt: submittedAt,
      },
    })

    await prisma.answer.createMany({
      data: [
        { responseSessionId: session.id, questionId: q001.id, value: 'fr', isDraft: false },
        { responseSessionId: session.id, questionId: q002.id, value: 'yes', isDraft: false },
        { responseSessionId: session.id, questionId: q014.id, value: index % 2 === 0 ? 6 : 5, isDraft: false },
        { responseSessionId: session.id, questionId: q015.id, value: `Formulation plus claire demandée ${index + 1}`, isDraft: false },
        { responseSessionId: session.id, questionId: q016.id, value: index % 3 === 0 ? 4 : 5, isDraft: false },
        { responseSessionId: session.id, questionId: q027.id, value: 'Aucune difficulté majeure pendant le test.', isDraft: false },
      ],
    })

    await prisma.telemetryEvent.createMany({
      data: [
        {
          responseSessionId: session.id,
          questionId: q014.id,
          popupDefinitionId: q014.popupDefinitions[0]?.id,
          eventType: 'popup_open',
          eventPayload: { termKey: 'coordination_inter_site', page: 2, language: 'fr' },
          durationMs: 8_000 + index * 700,
          occurredAt: new Date(submittedAt.getTime() - 6 * 60 * 1000),
        },
        {
          responseSessionId: session.id,
          questionId: q014.id,
          eventType: 'question_time',
          eventPayload: { page: 2 },
          durationMs: 70_000 + index * 5_000,
          occurredAt: new Date(submittedAt.getTime() - 5 * 60 * 1000),
        },
        {
          responseSessionId: session.id,
          questionId: q014.id,
          eventType: 'answer_change',
          eventPayload: { previousShape: 'number', nextShape: 'number', page: 2 },
          occurredAt: new Date(submittedAt.getTime() - 4 * 60 * 1000),
        },
        {
          responseSessionId: session.id,
          eventType: index % 2 === 0 ? 'backward_navigation' : 'questionnaire_resume',
          eventPayload: { seeded: true, page: 2 },
          occurredAt: new Date(submittedAt.getTime() - 3 * 60 * 1000),
        },
        {
          responseSessionId: session.id,
          eventType: 'questionnaire_total_time',
          eventPayload: { seeded: true },
          durationMs: 240_000 + index * 25_000,
          occurredAt: submittedAt,
        },
      ],
    })

    await prisma.submission.create({
      data: {
        responseSessionId: session.id,
        publicCode,
        questionnaireVersionId,
        buildingId,
        submittedAt,
        answerCount: 6,
        pathFingerprint: sha256(`${publicCode}:path`),
      },
    })
  }

  const pendingCode = 'PEND-0001'
  const pendingToken = createRespondentToken(pendingCode)
  await prisma.invitation.create({
    data: {
      questionnaireVersionId,
      buildingId,
      siteId,
      createdByUserId: moderatorId,
      publicCode: pendingCode,
      tokenHash: sha256(pendingToken),
      status: 'sent',
      notifyModerator: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sentAt: new Date(),
      identityVaultEntry: {
        create: {
          uniqueCode: pendingCode,
          encryptedEmail: encryptEmail('pending.demo@example.org'),
          emailHash: hashEmail('pending.demo@example.org'),
          questionnaireVersionId,
          buildingId,
          createdByUserId: moderatorId,
          lastEmailSentAt: new Date(),
        },
      },
      deliveryEvents: {
        create: {
          publicCode: pendingCode,
          eventType: 'dev_link_created',
          metadata: { seeded: true, accessLink: `/r/${pendingToken}` },
        },
      },
    },
  })
}

function encryptEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase()
  const version = 'v1'
  const iv = randomBytes(12)
  const key = process.env.EMAIL_ENCRYPTION_KEY_B64
    ? Buffer.from(process.env.EMAIL_ENCRYPTION_KEY_B64, 'base64')
    : createHash('sha256').update(emailEncryptionSecret).digest()

  if (key.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY_B64 doit contenir 32 octets encodés en base64')
  }

  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })
  cipher.setAAD(Buffer.from(version, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(normalizedEmail, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [version, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

function hashEmail(email: string): string {
  return createHmac('sha256', emailHashPepper).update(email.trim().toLowerCase()).digest('hex')
}

function createRespondentToken(publicCode: string): string {
  const secretPart = randomBytes(32).toString('base64url')
  const unsigned = `${publicCode}.${secretPart}`
  const signature = createHmac('sha256', respondentTokenSecret).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
