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
  | 'site_manager'
  | 'moderator'
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
    email: 'questionnaire.admin@chpm.local',
    password: 'Questionnaire123!',
    displayName: 'Quentin Questionnaires',
    role: 'questionnaire_admin',
  },
  {
    email: 'analyste@chpm.local',
    password: 'Analyst123!',
    displayName: 'Nadia Bernard',
    role: 'analyst',
  },
  {
    email: 'site.manager@chpm.local',
    password: 'SiteManager123!',
    displayName: 'Sophie Responsable de site',
    role: 'site_manager',
    siteCode: 'MTL',
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
  const lec5Version = await createLec5Questionnaire(organization.id, admin.id)

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

  const demoBuildings = ['MTL-A', 'PAR-C', 'TYO-H'].map((code) => {
    const buildingRecord = buildingByCode.get(code)

    if (!buildingRecord) {
      throw new Error(`Bâtiment de démonstration introuvable : ${code}`)
    }

    return {
      code,
      buildingId: buildingRecord.id,
      siteId: buildingRecord.siteId,
    }
  })

  await createDemoInvitations(publishedVersion.id, moderator.id, demoBuildings)
  await createDemoFieldTrackingRecords(publishedVersion.id, moderator.id, requireDemoBuilding(demoBuildings, 'MTL-A'))
  const terminalSeeds = await createDemoTerminalDevices(organization.id, moderator.id, demoBuildings)
  const terminalInvitation = await createOnsiteTerminalInvitation(itqVersion.id, moderator.id, terminalSeeds[0]!)
  const itqDemoToken = await createSeedInvitation(
    itqVersion.id,
    moderator.id,
    buildingByCode.get('MTL-A')!.id,
    buildingByCode.get('MTL-A')!.siteId,
    'ITQ-0001',
    'itq.demo@example.org',
  )
  const lec5DemoToken = await createSeedInvitation(
    lec5Version.id,
    moderator.id,
    buildingByCode.get('MTL-A')!.id,
    buildingByCode.get('MTL-A')!.siteId,
    'LEC5-0001',
    'lec5.demo@example.org',
  )
  await createItqDemoInvitations(itqVersion.id, moderator.id, demoBuildings, terminalSeeds)


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
      {
        userId: admin.id,
        questionnaireVersionId: lec5Version.id,
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
  console.log(`Questionnaire LEC-5 seedé : version papier de démonstration, 17 situations en choix multiples, question d’événement le plus difficile et champ Autre.`)
  console.log(`Lien répondant ITQ de démonstration : /r/${itqDemoToken}`)
  console.log(`Lien répondant LEC-5 de démonstration : /r/${lec5DemoToken}`)
  console.log(`Lien terminal hospitalier de démonstration : /terminal/${terminalSeeds[0]?.terminalToken}`)
  console.log(`Invitation ITQ affectée au terminal : ${terminalInvitation.publicCode}`)
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
  await (prisma as any).terminalDevice.deleteMany()
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


const lec5ExposureOptions: Array<[string, string]> = [
  ['happened_to_me', 'Ce m’est arrivé'],
  ['witnessed_it', 'J’en ai été témoin'],
  ['learned_about_it', 'Je l’ai appris'],
  ['part_of_work', 'Dans le cadre du travail'],
  ['not_applicable', 'Ne s’applique pas'],
  ['not_sure', 'Je ne suis pas sûr'],
]

const lec5Events: Array<{ code: string; label: string }> = [
  {
    code: 'LEC5-E01',
    label: '1. Catastrophe naturelle (inondation, ouragan, tornade, tremblement de terre, etc.)',
  },
  {
    code: 'LEC5-E02',
    label: '2. Incendie ou explosion',
  },
  {
    code: 'LEC5-E03',
    label: '3. Accident de la route (voiture, bateau, déraillement de train, écrasement d’avion, etc.)',
  },
  {
    code: 'LEC5-E04',
    label: '4. Accident grave au travail, à domicile ou pendant des loisirs',
  },
  {
    code: 'LEC5-E05',
    label: '5. Exposition à une substance toxique (produits chimiques dangereux, radiation, etc.)',
  },
  {
    code: 'LEC5-E06',
    label: '6. Agression physique (attaqué, frappé, poignardé, battu, coups de pied, etc.)',
  },
  {
    code: 'LEC5-E07',
    label: '7. Attaque à main armée (menacé ou blessé par une arme à feu, un couteau, une bombe, etc.)',
  },
  {
    code: 'LEC5-E08',
    label: '8. Agression sexuelle (viol, tentative, acte sexuel par la force ou sous menaces)',
  },
  {
    code: 'LEC5-E09',
    label: '9. Autre expérience sexuelle non désirée et désagréable (abus sexuel dans l’enfance)',
  },
  {
    code: 'LEC5-E10',
    label: '10. Conflit armé ou présence en zone de guerre (dans l’armée ou comme civil)',
  },
  {
    code: 'LEC5-E11',
    label: '11. Captivité (kidnappé, enlevé, pris en otage, incarcéré comme prisonnier de guerre, etc.)',
  },
  {
    code: 'LEC5-E12',
    label: '12. Maladie ou blessure mettant la vie en danger',
  },
  {
    code: 'LEC5-E13',
    label: '13. Souffrances humaines intenses',
  },
  {
    code: 'LEC5-E14',
    label: '14. Mort violente (homicide, suicide, etc.)',
  },
  {
    code: 'LEC5-E15',
    label: '15. Mort subite et accidentelle',
  },
  {
    code: 'LEC5-E16',
    label: '16. Blessure grave, dommage ou mort causé par vous à quelqu’un',
  },
  {
    code: 'LEC5-E17',
    label: '17. Toute autre expérience très stressante (négligence sévère dans l’enfance, etc.)',
  },
]

async function createLec5Questionnaire(organizationId: string, ownerUserId: string) {
  const questionnaire = await prisma.questionnaire.create({
    data: {
      organizationId,
      ownerUserId,
      code: 'LEC5-PPP',
      title: 'Inventaire des événements de vie — LEC-5',
      description:
        'PPP+ · Prévalence du Psychotrauma en Psychiatrie. Version papier de démonstration de l’inventaire LEC-5, intégré au parcours ITQ.',
      defaultLanguage: 'fr',
      finality:
        'Repérer les situations difficiles ou stressantes vécues, observées, apprises ou rencontrées dans le cadre professionnel. Seed de démonstration, sans interprétation clinique automatisée.',
      status: 'published',
    },
  })

  return prisma.questionnaireVersion.create({
    data: {
      questionnaireId: questionnaire.id,
      versionLabel: '1.0-papier-demo',
      language: 'fr',
      status: 'published',
      description:
        'LEC-5 version papier : 17 situations cochables selon six modalités d’exposition, une question pour l’événement le plus difficile et un champ Autre à préciser.',
      finality: questionnaire.finality,
      openFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      openUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(),
      immutableAt: new Date(),
      groups: {
        create: [
          {
            title: 'Présentation papier PPP+ / LEC-5',
            description:
              'Questionnaire ITQ — version papier · Prévalence du Psychotrauma en Psychiatrie · CH de Montfavet Cloitre et al. ©2018 · traduction FR validée Peraud et al. 2022 · mise en page inspirée du Cn2r.',
            displayOrder: 1,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'LEC5-INTRO',
                  1,
                  'VOS EXPÉRIENCES — situations vécues (inventaire LEC-5)',
                  'information',
                  false,
                  'Voici une liste de situations difficiles ou stressantes qu’une personne peut avoir à traverser. Pour chaque situation, cochez la ou les case(s) correspondante(s). Encerclez celle qui fut la plus difficile pour vous, en considérant l’ensemble de votre vie, de l’enfance à l’âge adulte.',
                ),
              ],
            },
          },
          {
            title: 'Situations vécues',
            description:
              'Pour chaque situation, cochez une ou plusieurs modalités : ce m’est arrivé, j’en ai été témoin, je l’ai appris, dans le cadre du travail, ne s’applique pas, ou je ne suis pas sûr.',
            displayOrder: 2,
            questionsPerPage: 3,
            randomize: false,
            questions: {
              create: lec5Events.map((event, index) =>
                question(
                  event.code,
                  index + 1,
                  event.label,
                  'multiple_choice',
                  false,
                  'Cochez la ou les case(s) correspondante(s). Plusieurs réponses sont possibles.',
                  lec5ExposureOptions,
                ),
              ),
            },
          },
          {
            title: 'Événement le plus difficile',
            description:
              'Indiquez la situation qui fut la plus difficile pour vous sur l’ensemble de votre vie, puis précisez “Autre” si nécessaire.',
            displayOrder: 3,
            questionsPerPage: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'LEC5-WORST',
                  1,
                  'Quelle situation fut la plus difficile pour vous ?',
                  'single_choice',
                  false,
                  'Correspond à la consigne papier “Encerclez celle qui fut la plus difficile pour vous”.',
                  [
                    ...lec5Events.map((event) => [event.code, event.label] as [string, string]),
                    ['LEC5-E18', '18. Autre expérience précisée ci-dessous'],
                  ],
                ),
                question(
                  'LEC5-OTHER',
                  2,
                  '18. Autre (précisez)',
                  'free_text_short',
                  false,
                  'Champ libre facultatif. Évitez les noms, dates exactes, lieux précis ou tout détail directement identifiant.',
                ),
              ],
            },
          },
        ],
      },
    },
  })
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

type DemoBuildingTarget = {
  code: string
  buildingId: string
  siteId: string
}

type DemoInvitationStatus = 'sent' | 'opened' | 'in_progress' | 'draft' | 'submitted' | 'expired'

type DemoQuestionWithPopups = {
  id: string
  code: string
  responseType: string
  popupDefinitions: Array<{ id: string; termKey: string }>
}

type DemoInvitationSeedParams = {
  questionnaireVersionId: string
  moderatorId: string
  building: DemoBuildingTarget
  publicCode: string
  email: string
  status: DemoInvitationStatus
  sentAt: Date
  openedAt?: Date
  startedAt?: Date
  submittedAt?: Date
  expiresAt?: Date
  includeAccessLink?: boolean
  terminalDevice?: any
  assistanceMode?: 'none' | 'technical_help' | 'full_assisted_entry'
}

async function createDemoInvitations(questionnaireVersionId: string, moderatorId: string, buildings: DemoBuildingTarget[]) {
  const questions = await prisma.question.findMany({
    where: {
      group: {
        questionnaireVersionId,
      },
    },
    include: {
      popupDefinitions: {
        select: { id: true, termKey: true },
      },
    },
    orderBy: { code: 'asc' },
  })
  const questionByCode = new Map<string, DemoQuestionWithPopups>(questions.map((item: DemoQuestionWithPopups) => [item.code, item]))
  const required = (code: string) => requireSeedQuestion(questionByCode, code)
  const q001 = required('Q-001')
  const q002 = required('Q-002')
  const q014 = required('Q-014')
  const q015 = required('Q-015')
  const q016 = required('Q-016')
  const q027 = required('Q-027')

  const campaigns = [
    {
      buildingCode: 'MTL-A',
      submitted: 6,
      pending: [
        { suffix: 'DRAFT', status: 'draft' as DemoInvitationStatus },
        { suffix: 'SENT', status: 'sent' as DemoInvitationStatus },
      ],
    },
    {
      buildingCode: 'PAR-C',
      submitted: 5,
      pending: [
        { suffix: 'OPEN', status: 'opened' as DemoInvitationStatus },
        { suffix: 'EXP', status: 'expired' as DemoInvitationStatus },
      ],
    },
    {
      buildingCode: 'TYO-H',
      submitted: 3,
      pending: [
        { suffix: 'SENT', status: 'sent' as DemoInvitationStatus },
      ],
    },
  ]

  let globalSubmissionIndex = 0

  for (const campaign of campaigns) {
    const building = requireDemoBuilding(buildings, campaign.buildingCode)

    for (let index = 0; index < campaign.submitted; index += 1) {
      const publicCode = globalSubmissionIndex === 0
        ? '8F4K-29QX'
        : `CHPM-${campaign.buildingCode.replace('-', '')}-${String(index + 1).padStart(3, '0')}`
      const submittedAt = daysAgo(10 - globalSubmissionIndex, -15 * index)
      const startedAt = new Date(submittedAt.getTime() - (4 * 60_000 + index * 12_000))
      const email = `chpm.${campaign.buildingCode.toLowerCase().replace('-', '.')}.${index + 1}@example.org`
      const { invitation } = await createDemoInvitationRecord({
        questionnaireVersionId,
        moderatorId,
        building,
        publicCode,
        email,
        status: 'submitted',
        sentAt: daysAgo(20 - globalSubmissionIndex),
        openedAt: daysAgo(18 - globalSubmissionIndex),
        startedAt,
        submittedAt,
        assistanceMode: 'none',
      })

      const session = await prisma.responseSession.create({
        data: {
          invitationId: invitation.id,
          publicCode,
          questionnaireVersionId,
          buildingId: building.buildingId,
          assistanceMode: 'none',
          status: 'locked',
          currentPage: 4,
          randomizationSeed: sha256(`${publicCode}:seed`),
          pathFingerprint: sha256(`${publicCode}:path`),
          startedAt,
          lastSeenAt: submittedAt,
          submittedAt,
          lockedAt: submittedAt,
        },
      })

      const longFreeText = chpmFreeTextAnswer(globalSubmissionIndex)
      await prisma.answer.createMany({
        data: [
          { responseSessionId: session.id, questionId: q001.id, value: 'fr', isDraft: false, createdAt: startedAt, updatedAt: submittedAt },
          { responseSessionId: session.id, questionId: q002.id, value: 'yes', isDraft: false, createdAt: startedAt, updatedAt: submittedAt },
          { responseSessionId: session.id, questionId: q014.id, value: chpmCoordinationScore(globalSubmissionIndex), isDraft: false, createdAt: startedAt, updatedAt: submittedAt },
          {
            responseSessionId: session.id,
            questionId: q015.id,
            value: longFreeText.value,
            isDraft: false,
            identifiabilityWarning: longFreeText.identifiabilityWarning,
            warningReason: longFreeText.warningReason,
            createdAt: startedAt,
            updatedAt: submittedAt,
          },
          { responseSessionId: session.id, questionId: q016.id, value: chpmCoherenceScore(globalSubmissionIndex), isDraft: false, createdAt: startedAt, updatedAt: submittedAt },
          { responseSessionId: session.id, questionId: q027.id, value: chpmFinalComment(globalSubmissionIndex), isDraft: false, createdAt: startedAt, updatedAt: submittedAt },
        ],
      })

      await prisma.telemetryEvent.createMany({
        data: buildChpmTelemetry(session.id, submittedAt, globalSubmissionIndex, q014, q015, q016, q027),
      })

      await prisma.submission.create({
        data: {
          responseSessionId: session.id,
          publicCode,
          questionnaireVersionId,
          buildingId: building.buildingId,
          submittedAt,
          answerCount: 6,
          pathFingerprint: sha256(`${publicCode}:path`),
        },
      })

      globalSubmissionIndex += 1
    }

    for (const pending of campaign.pending) {
      const publicCode = `CHPM-${campaign.buildingCode.replace('-', '')}-${pending.suffix}`
      const status = pending.status
      const sentAt = status === 'expired' ? daysAgo(45) : daysAgo(3)
      const openedAt = status === 'opened' || status === 'draft' ? daysAgo(2) : undefined
      const startedAt = status === 'draft' ? daysAgo(1) : undefined
      const { invitation, token } = await createDemoInvitationRecord({
        questionnaireVersionId,
        moderatorId,
        building,
        publicCode,
        email: `chpm.${campaign.buildingCode.toLowerCase().replace('-', '.')}.${pending.suffix.toLowerCase()}@example.org`,
        status,
        sentAt,
        openedAt,
        startedAt,
        expiresAt: status === 'expired' ? daysAgo(10) : undefined,
        includeAccessLink: status !== 'expired',
      })

      if (status === 'draft' && startedAt) {
        const session = await prisma.responseSession.create({
          data: {
            invitationId: invitation.id,
            publicCode,
            questionnaireVersionId,
            buildingId: building.buildingId,
            status: 'draft',
            currentPage: 2,
            randomizationSeed: sha256(`${publicCode}:seed`),
            pathFingerprint: sha256(`${publicCode}:path`),
            startedAt,
            lastSeenAt: daysAgo(0),
          },
        })

        await prisma.answer.createMany({
          data: [
            { responseSessionId: session.id, questionId: q001.id, value: 'fr', isDraft: false, createdAt: startedAt, updatedAt: startedAt },
            { responseSessionId: session.id, questionId: q002.id, value: 'yes', isDraft: true, createdAt: startedAt, updatedAt: startedAt },
          ],
        })
        await prisma.telemetryEvent.create({
          data: {
            responseSessionId: session.id,
            eventType: 'questionnaire_resume',
            eventPayload: { seeded: true, status, accessLink: `/r/${token}` },
            occurredAt: daysAgo(0),
          },
        })
      }
    }
  }
}

async function createItqDemoInvitations(questionnaireVersionId: string, moderatorId: string, buildings: DemoBuildingTarget[], terminalDevices: any[] = []) {
  const questions = await prisma.question.findMany({
    where: {
      group: {
        questionnaireVersionId,
      },
    },
    include: {
      popupDefinitions: {
        select: { id: true, termKey: true },
      },
    },
    orderBy: { code: 'asc' },
  })
  const questionByCode = new Map<string, DemoQuestionWithPopups>(questions.map((item: DemoQuestionWithPopups) => [item.code, item]))

  for (const code of itqQuestionCodes) {
    requireSeedQuestion(questionByCode, code)
  }

  const campaigns = [
    {
      buildingCode: 'MTL-A',
      submitted: 7,
      pending: [
        { suffix: 'DRAFT', status: 'draft' as DemoInvitationStatus },
        { suffix: 'SENT', status: 'sent' as DemoInvitationStatus },
      ],
    },
    {
      buildingCode: 'PAR-C',
      submitted: 6,
      pending: [
        { suffix: 'OPEN', status: 'opened' as DemoInvitationStatus },
        { suffix: 'EXP', status: 'expired' as DemoInvitationStatus },
      ],
    },
    {
      buildingCode: 'TYO-H',
      submitted: 4,
      pending: [
        { suffix: 'SENT', status: 'sent' as DemoInvitationStatus },
      ],
    },
  ]

  let globalSubmissionIndex = 0

  for (const campaign of campaigns) {
    const building = requireDemoBuilding(buildings, campaign.buildingCode)

    for (let index = 0; index < campaign.submitted; index += 1) {
      const publicCode = `ITQ-${campaign.buildingCode.replace('-', '')}-${String(index + 1).padStart(3, '0')}`
      const submittedAt = daysAgo(16 - globalSubmissionIndex, -9 * index)
      const startedAt = new Date(submittedAt.getTime() - (8 * 60_000 + globalSubmissionIndex * 15_000))
      const email = `itq.${campaign.buildingCode.toLowerCase().replace('-', '.')}.${index + 1}@example.org`
      const terminalDevice = campaign.buildingCode === 'MTL-A' && index < 2
        ? terminalDevices.find((device) => device.building?.code === campaign.buildingCode)
        : undefined
      const assistanceMode = terminalDevice && index === 1 ? 'technical_help' : 'none'
      const { invitation } = await createDemoInvitationRecord({
        questionnaireVersionId,
        moderatorId,
        building,
        publicCode,
        email,
        status: 'submitted',
        sentAt: daysAgo(25 - globalSubmissionIndex),
        openedAt: daysAgo(23 - globalSubmissionIndex),
        startedAt,
        submittedAt,
        terminalDevice,
        assistanceMode,
      })

      const session = await prisma.responseSession.create({
        data: {
          invitationId: invitation.id,
          publicCode,
          questionnaireVersionId,
          buildingId: building.buildingId,
          terminalDeviceId: terminalDevice?.id,
          assistanceMode,
          assistanceDeclaredAt: assistanceMode !== 'none' ? startedAt : undefined,
          status: 'locked',
          currentPage: 20,
          randomizationSeed: sha256(`${publicCode}:seed`),
          pathFingerprint: sha256(`${publicCode}:path`),
          startedAt,
          lastSeenAt: submittedAt,
          submittedAt,
          lockedAt: submittedAt,
        },
      })

      await prisma.answer.createMany({
        data: itqQuestionCodes.map((code) => {
          const question = requireSeedQuestion(questionByCode, code)
          const answer = itqAnswerFor(code, globalSubmissionIndex, campaign.buildingCode)

          return {
            responseSessionId: session.id,
            questionId: question.id,
            value: answer.value,
            isDraft: false,
            identifiabilityWarning: answer.identifiabilityWarning,
            warningReason: answer.warningReason,
            createdAt: startedAt,
            updatedAt: submittedAt,
          }
        }),
      })

      await prisma.telemetryEvent.createMany({
        data: buildItqTelemetry(session.id, submittedAt, globalSubmissionIndex, questionByCode),
      })

      await prisma.submission.create({
        data: {
          responseSessionId: session.id,
          publicCode,
          questionnaireVersionId,
          buildingId: building.buildingId,
          submittedAt,
          answerCount: itqQuestionCodes.length,
          pathFingerprint: sha256(`${publicCode}:path`),
        },
      })

      globalSubmissionIndex += 1
    }

    for (const pending of campaign.pending) {
      const publicCode = `ITQ-${campaign.buildingCode.replace('-', '')}-${pending.suffix}`
      const status = pending.status
      const sentAt = status === 'expired' ? daysAgo(50) : daysAgo(4)
      const openedAt = status === 'opened' || status === 'draft' ? daysAgo(3) : undefined
      const startedAt = status === 'draft' ? daysAgo(2) : undefined
      const { invitation, token } = await createDemoInvitationRecord({
        questionnaireVersionId,
        moderatorId,
        building,
        publicCode,
        email: `itq.${campaign.buildingCode.toLowerCase().replace('-', '.')}.${pending.suffix.toLowerCase()}@example.org`,
        status,
        sentAt,
        openedAt,
        startedAt,
        expiresAt: status === 'expired' ? daysAgo(12) : undefined,
        includeAccessLink: status !== 'expired',
      })

      if (status === 'draft' && startedAt) {
        const session = await prisma.responseSession.create({
          data: {
            invitationId: invitation.id,
            publicCode,
            questionnaireVersionId,
            buildingId: building.buildingId,
            status: 'draft',
            currentPage: 7,
            randomizationSeed: sha256(`${publicCode}:seed`),
            pathFingerprint: sha256(`${publicCode}:path`),
            startedAt,
            lastSeenAt: daysAgo(1),
          },
        })
        const expDesc = requireSeedQuestion(questionByCode, 'ITQ-EXP-DESC')
        const expDate = requireSeedQuestion(questionByCode, 'ITQ-EXP-DATE')

        await prisma.answer.createMany({
          data: [
            { responseSessionId: session.id, questionId: expDesc.id, value: 'Brouillon de démonstration non soumis.', isDraft: false, createdAt: startedAt, updatedAt: startedAt },
            { responseSessionId: session.id, questionId: expDate.id, value: '1_5_ans', isDraft: true, createdAt: startedAt, updatedAt: startedAt },
          ],
        })
        await prisma.telemetryEvent.create({
          data: {
            responseSessionId: session.id,
            eventType: 'questionnaire_resume',
            eventPayload: { seeded: true, questionnaire: 'ITQ', accessLink: `/r/${token}` },
            occurredAt: daysAgo(1),
          },
        })
      }
    }
  }
}

async function createDemoFieldTrackingRecords(questionnaireVersionId: string, moderatorId: string, building: DemoBuildingTarget) {
  const records = [
    {
      publicCode: 'PAPR-CHPM-001',
      deliveryMode: 'paper_form',
      status: 'sent',
      eventType: 'paper_form_recorded',
      assistanceMode: 'full_assisted_entry',
      sentAt: daysAgo(2),
      cancelledAt: undefined,
      note: 'Passation papier seedée pour une personne sans email/SMS',
    },
    {
      publicCode: 'REFU-CHPM-001',
      deliveryMode: 'refusal_record',
      status: 'cancelled',
      eventType: 'participation_refusal_recorded',
      assistanceMode: 'none',
      sentAt: undefined,
      cancelledAt: daysAgo(1),
      note: 'Refus seedé avant collecte de contact numérique',
    },
  ]

  for (const record of records) {
    const token = createRespondentToken(record.publicCode)
    await prisma.invitation.create({
      data: {
        questionnaireVersionId,
        buildingId: building.buildingId,
        siteId: building.siteId,
        createdByUserId: moderatorId,
        publicCode: record.publicCode,
        tokenHash: sha256(token),
        status: record.status as any,
        deliveryMode: record.deliveryMode as any,
        assistanceMode: record.assistanceMode as any,
        notifyModerator: true,
        notifyAdmins: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sentAt: record.sentAt,
        cancelledAt: record.cancelledAt,
        deliveryEvents: {
          create: {
            publicCode: record.publicCode,
            eventType: record.eventType,
            metadata: {
              seeded: true,
              buildingCode: building.code,
              deliveryMode: record.deliveryMode,
              note: record.note,
            },
            occurredAt: record.cancelledAt ?? record.sentAt ?? new Date(),
          },
        },
      },
    })
  }
}

async function createDemoTerminalDevices(organizationId: string, moderatorId: string, buildings: DemoBuildingTarget[]) {
  const targets = [
    { code: 'TERM-MTL-A-ACCUEIL', label: 'Tablette accueil · Montréal A', building: requireDemoBuilding(buildings, 'MTL-A') },
    { code: 'TERM-MTL-A-SALLE', label: 'Borne salle commune · Montréal A', building: requireDemoBuilding(buildings, 'MTL-A') },
    { code: 'TERM-PAR-C-ACCUEIL', label: 'Tablette accueil · Paris C', building: requireDemoBuilding(buildings, 'PAR-C') },
  ]

  const devices = []
  for (const target of targets) {
    const terminalToken = createRespondentToken(target.code)
    const device = await (prisma as any).terminalDevice.create({
      data: {
        organizationId,
        siteId: target.building.siteId,
        buildingId: target.building.buildingId,
        createdByUserId: moderatorId,
        code: target.code,
        label: target.label,
        accessTokenHash: sha256(terminalToken),
        status: 'active',
        lastSeenAt: daysAgo(0, -20),
      },
    })
    devices.push({ ...device, building: target.building, terminalToken })
  }

  return devices
}

async function createOnsiteTerminalInvitation(questionnaireVersionId: string, moderatorId: string, terminal: any) {
  const publicCode = 'TERM-ITQ-001'
  const placeholderToken = createRespondentToken(publicCode)

  return prisma.invitation.create({
    data: {
      questionnaireVersionId,
      buildingId: terminal.building.buildingId,
      siteId: terminal.building.siteId,
      createdByUserId: moderatorId,
      publicCode,
      tokenHash: sha256(placeholderToken),
      status: 'sent',
      deliveryMode: 'onsite_terminal',
      terminalDeviceId: terminal.id,
      terminalDispatchedAt: new Date(),
      assistanceMode: 'none',
      notifyModerator: true,
      notifyAdmins: false,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      sentAt: new Date(),
      deliveryEvents: {
        create: {
          publicCode,
          eventType: 'terminal_invitation_assigned',
          metadata: {
            seeded: true,
            terminalDeviceId: terminal.id,
            terminalCode: terminal.code,
            terminalLink: `/terminal/${terminal.terminalToken}`,
          },
        },
      },
    },
  })
}

async function createDemoInvitationRecord(params: DemoInvitationSeedParams) {
  const token = createRespondentToken(params.publicCode)
  const isTerminal = Boolean(params.terminalDevice)
  const deliveryMode = isTerminal ? 'onsite_terminal' : 'email_simulation'
  const metadata: Record<string, unknown> = {
    seeded: true,
    status: params.status,
    buildingCode: params.building.code,
    deliveryMode,
    terminalDeviceId: params.terminalDevice?.id,
    terminalCode: params.terminalDevice?.code,
  }

  if (params.includeAccessLink) {
    metadata.accessLink = `/r/${token}`
  }

  const invitation = await prisma.invitation.create({
    data: {
      questionnaireVersionId: params.questionnaireVersionId,
      buildingId: params.building.buildingId,
      siteId: params.building.siteId,
      createdByUserId: params.moderatorId,
      publicCode: params.publicCode,
      tokenHash: sha256(token),
      status: params.status,
      deliveryMode,
      terminalDeviceId: params.terminalDevice?.id,
      terminalDispatchedAt: isTerminal ? params.sentAt : undefined,
      assistanceMode: params.assistanceMode ?? 'none',
      notifyModerator: true,
      notifyAdmins: params.status === 'submitted',
      expiresAt: params.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sentAt: params.sentAt,
      openedAt: params.openedAt,
      startedAt: params.startedAt,
      submittedAt: params.submittedAt,
      identityVaultEntry: isTerminal ? undefined : {
        create: {
          uniqueCode: params.publicCode,
          encryptedEmail: encryptEmail(params.email),
          emailHash: hashEmail(params.email),
          questionnaireVersionId: params.questionnaireVersionId,
          buildingId: params.building.buildingId,
          createdByUserId: params.moderatorId,
          lastEmailSentAt: params.sentAt,
          deletionScheduledAt: params.status === 'expired' ? daysAgo(-30) : undefined,
        },
      },
      deliveryEvents: {
        create: [
          {
            publicCode: params.publicCode,
            eventType: isTerminal ? 'terminal_invitation_assigned' : 'dev_link_created',
            metadata,
            occurredAt: params.sentAt,
          },
          ...(params.openedAt
            ? [{
                publicCode: params.publicCode,
                eventType: 'link_opened',
                metadata: { seeded: true },
                occurredAt: params.openedAt,
              }]
            : []),
        ],
      },
    },
  })

  return { invitation, token }
}

function requireDemoBuilding(buildings: DemoBuildingTarget[], code: string): DemoBuildingTarget {
  const building = buildings.find((item) => item.code === code)

  if (!building) {
    throw new Error(`Bâtiment de seed stats introuvable : ${code}`)
  }

  return building
}

function requireSeedQuestion(questionByCode: Map<string, DemoQuestionWithPopups>, code: string): DemoQuestionWithPopups {
  const question = questionByCode.get(code)

  if (!question) {
    throw new Error(`Question de seed stats introuvable : ${code}`)
  }

  return question
}

function buildChpmTelemetry(
  responseSessionId: string,
  submittedAt: Date,
  index: number,
  q014: DemoQuestionWithPopups,
  q015: DemoQuestionWithPopups,
  q016: DemoQuestionWithPopups,
  q027: DemoQuestionWithPopups,
) {
  const popupDefinition = q014.popupDefinitions[0]
  const events: any[] = [
    ...(popupDefinition
      ? [{
          responseSessionId,
          popupDefinitionId: popupDefinition.id,
          eventType: 'popup_open',
          eventPayload: { termKey: popupDefinition.termKey, page: 2, seeded: true },
          durationMs: 8_000 + index * 450,
          occurredAt: minutesBefore(submittedAt, 9),
        }]
      : []),
    {
      responseSessionId,
      questionId: q014.id,
      eventType: 'question_time',
      eventPayload: { page: 2, seeded: true },
      durationMs: 64_000 + index * 4_200,
      occurredAt: minutesBefore(submittedAt, 8),
    },
    {
      responseSessionId,
      questionId: q015.id,
      eventType: 'question_time',
      eventPayload: { page: 2, seeded: true },
      durationMs: 46_000 + index * 2_500,
      occurredAt: minutesBefore(submittedAt, 7),
    },
    {
      responseSessionId,
      questionId: q016.id,
      eventType: 'question_time',
      eventPayload: { page: 2, seeded: true },
      durationMs: 34_000 + index * 1_300,
      occurredAt: minutesBefore(submittedAt, 6),
    },
    {
      responseSessionId,
      questionId: q027.id,
      eventType: 'question_time',
      eventPayload: { page: 4, seeded: true },
      durationMs: 39_000 + index * 1_100,
      occurredAt: minutesBefore(submittedAt, 4),
    },
    {
      responseSessionId,
      eventType: 'page_change',
      eventPayload: { from: 2, to: 3, seeded: true },
      durationMs: 18_000 + index * 500,
      occurredAt: minutesBefore(submittedAt, 3),
    },
    {
      responseSessionId,
      eventType: 'questionnaire_total_time',
      eventPayload: { seeded: true },
      durationMs: 245_000 + index * 18_000,
      occurredAt: submittedAt,
    },
  ]

  if (index % 2 === 0) {
    events.push({
      responseSessionId,
      questionId: q014.id,
      eventType: 'answer_change',
      eventPayload: { previousShape: 'number', nextShape: 'number', seeded: true },
      occurredAt: minutesBefore(submittedAt, 5),
    })
  }

  if (index % 3 === 0) {
    events.push({
      responseSessionId,
      eventType: 'backward_navigation',
      eventPayload: { from: 3, to: 2, seeded: true },
      occurredAt: minutesBefore(submittedAt, 4),
    })
  }

  if (index % 4 === 0) {
    events.push({
      responseSessionId,
      eventType: 'questionnaire_resume',
      eventPayload: { page: 2, seeded: true },
      occurredAt: minutesBefore(submittedAt, 11),
    })
  }

  return events
}

const itqQuestionCodes = [
  'ITQ-EXP-DESC',
  'ITQ-EXP-DATE',
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8',
  'P9',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'C8',
  'C9',
]

function buildItqTelemetry(responseSessionId: string, submittedAt: Date, respondentIndex: number, questionByCode: Map<string, DemoQuestionWithPopups>) {
  const events: any[] = []

  itqQuestionCodes.forEach((code, questionIndex) => {
    const question = requireSeedQuestion(questionByCode, code)
    const durationMs = itqQuestionDurationMs(code, respondentIndex, questionIndex)

    events.push({
      responseSessionId,
      questionId: question.id,
      eventType: 'question_time',
      eventPayload: { code, page: questionIndex + 1, seeded: true },
      durationMs,
      occurredAt: minutesBefore(submittedAt, Math.max(1, itqQuestionCodes.length - questionIndex)),
    })

    const popupDefinition = question.popupDefinitions[0]
    if (popupDefinition && shouldOpenItqPopup(code, respondentIndex, questionIndex)) {
      events.push({
        responseSessionId,
        popupDefinitionId: popupDefinition.id,
        eventType: 'popup_open',
        eventPayload: { termKey: popupDefinition.termKey, code, seeded: true },
        durationMs: 5_500 + ((respondentIndex + questionIndex) % 5) * 1_100,
        occurredAt: minutesBefore(submittedAt, Math.max(1, itqQuestionCodes.length - questionIndex) + 1),
      })
    }

    if (question.responseType === 'likert' && (respondentIndex + questionIndex) % 7 === 0) {
      events.push({
        responseSessionId,
        questionId: question.id,
        eventType: 'answer_change',
        eventPayload: { previousShape: 'number', nextShape: 'number', code, seeded: true },
        occurredAt: minutesBefore(submittedAt, Math.max(1, itqQuestionCodes.length - questionIndex)),
      })
    }
  })

  if (respondentIndex % 3 === 0) {
    events.push({
      responseSessionId,
      eventType: 'questionnaire_resume',
      eventPayload: { page: 8, seeded: true },
      occurredAt: minutesBefore(submittedAt, 28),
    })
  }

  if (respondentIndex % 4 === 0) {
    events.push({
      responseSessionId,
      eventType: 'backward_navigation',
      eventPayload: { from: 12, to: 11, seeded: true },
      occurredAt: minutesBefore(submittedAt, 13),
    })
  }

  events.push({
    responseSessionId,
    eventType: 'questionnaire_total_time',
    eventPayload: { seeded: true, questionnaire: 'ITQ' },
    durationMs: 8 * 60_000 + respondentIndex * 24_000,
    occurredAt: submittedAt,
  })

  return events
}

function chpmCoordinationScore(index: number): number {
  const values = [2, 3, 4, 5, 6, 7, 3, 4, 5, 6, 2, 4, 5, 6]
  return values[index % values.length] ?? 4
}

function chpmCoherenceScore(index: number): number {
  const values = [3, 4, 5, 4, 5, 3, 2, 4, 5, 4, 3, 5, 4, 5]
  return values[index % values.length] ?? 4
}

function chpmFreeTextAnswer(index: number) {
  const answers = [
    'Remplacer coordination inter-site par un exemple concret entre deux bâtiments aiderait beaucoup.',
    'La formulation est claire, mais la bulle devrait apparaître avant la question.',
    'J’ai hésité sur le périmètre : service, bâtiment ou site complet.',
    'Le terme est compréhensible après lecture de l’aide contextuelle.',
    'Ajouter un exemple opérationnel éviterait une interprétation trop administrative.',
    'Mentionne fictivement Mme Martin du service A : contenu gardé pour tester l’alerte PII.',
  ]
  const value = answers[index % answers.length] ?? answers[0]!
  const identifiabilityWarning = value.includes('Mme Martin')

  return {
    value,
    identifiabilityWarning,
    warningReason: identifiabilityWarning ? 'Contenu libre potentiellement identifiant dans le seed de démonstration.' : undefined,
  }
}

function chpmFinalComment(index: number): string {
  const comments = [
    'Navigation fluide, reprise du brouillon rassurante.',
    'Aucune difficulté majeure pendant le test.',
    'Les popups rendent le vocabulaire plus accessible.',
    'Le bouton de soumission définitive est assez explicite.',
  ]

  return comments[index % comments.length] ?? comments[0]!
}

function itqAnswerFor(code: string, respondentIndex: number, buildingCode: string) {
  if (code === 'ITQ-EXP-DESC') {
    const descriptions = [
      'Accident ancien décrit sans détail directement identifiant.',
      'Événement professionnel difficile, résumé volontairement de façon générale.',
      'Situation familiale stressante, sans nom ni date précise.',
      'Agression passée mentionnée uniquement par catégorie.',
      'Événement fictif impliquant Jean Dupont : utilisé pour valider l’alerte PII.',
    ]
    const value = descriptions[respondentIndex % descriptions.length] ?? descriptions[0]!
    const identifiabilityWarning = value.includes('Jean Dupont')

    return {
      value,
      identifiabilityWarning,
      warningReason: identifiabilityWarning ? 'Nom propre détecté dans le champ libre du seed de démonstration.' : undefined,
    }
  }

  if (code === 'ITQ-EXP-DATE') {
    const periods = ['moins_6_mois', '6_12_mois', '1_5_ans', '5_10_ans', '10_20_ans', 'plus_20_ans']

    return {
      value: periods[(respondentIndex + buildingCode.length) % periods.length] ?? '1_5_ans',
      identifiabilityWarning: false,
      warningReason: undefined,
    }
  }

  return {
    value: itqLikertValue(code, respondentIndex, buildingCode),
    identifiabilityWarning: false,
    warningReason: undefined,
  }
}

function itqLikertValue(code: string, respondentIndex: number, buildingCode: string): number {
  const itemNumber = Number(code.slice(1)) || 1
  const isDso = code.startsWith('C')
  const profile = respondentIndex % 6
  const buildingShift = buildingCode === 'PAR-C' ? 1 : buildingCode === 'TYO-H' ? -1 : 0
  const profileBase = profile <= 1
    ? 3
    : profile === 2
      ? 2
      : profile === 3
        ? (isDso ? 1 : 3)
        : profile === 4
          ? (isDso ? 3 : 1)
          : 1
  const itemShift = itemNumber % 3 === 0 ? 1 : itemNumber % 4 === 0 ? -1 : 0

  return clamp(profileBase + buildingShift + itemShift, 0, 4)
}

function itqQuestionDurationMs(code: string, respondentIndex: number, questionIndex: number): number {
  if (code === 'ITQ-EXP-DESC') return 95_000 + respondentIndex * 1_800
  if (code === 'ITQ-EXP-DATE') return 22_000 + respondentIndex * 600
  if (['P2', 'P5', 'C1', 'C4', 'C7'].includes(code)) return 72_000 + respondentIndex * 2_400
  return 34_000 + questionIndex * 850 + respondentIndex * 500
}

function shouldOpenItqPopup(code: string, respondentIndex: number, questionIndex: number): boolean {
  return ['ITQ-EXP-DESC', 'P2', 'P5', 'C1', 'C7'].includes(code) || (respondentIndex + questionIndex) % 4 === 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function daysAgo(days: number, minutesOffset = 0): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 + minutesOffset * 60 * 1000)
}

function minutesBefore(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60 * 1000)
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
