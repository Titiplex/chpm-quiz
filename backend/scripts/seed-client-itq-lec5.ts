import { randomBytes } from 'node:crypto'

import { loadPrismaClient } from '../src/prisma/prisma-client.loader'

type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'likert'
  | 'free_text_short'
  | 'free_text_long'
  | 'information'

type QuestionSeed = {
  code: string
  label: string
  responseType: QuestionType
  isRequired: boolean
  helperText?: string
  options?: Array<[string, string]>
  likertScale?: {
    points: number
    minValue: number
    leftAnchor: string
    rightAnchor: string
    neutralLabel?: string
  }
}

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const organizationCode = required('BOOTSTRAP_ORGANIZATION_CODE').toUpperCase()
const ownerEmail = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase()
const questionnaireCode = (process.env.CLIENT_QUESTIONNAIRE_CODE?.trim() || 'LEC5-ITQ').toUpperCase()
const questionnaireTitle = process.env.CLIENT_QUESTIONNAIRE_TITLE?.trim() || 'LEC-5 + ITQ'
const versionLabel = process.env.CLIENT_QUESTIONNAIRE_VERSION?.trim() || '1.0-client'

const PrismaClientBase = loadPrismaClient()
const prisma = new PrismaClientBase({
  datasourceUrl: process.env.OPERATIONAL_DATABASE_URL ?? process.env.DATABASE_URL,
})

const lec5ExposureOptions: Array<[string, string]> = [
  ['happened_to_me', 'Ce m’est arrivé'],
  ['witnessed_it', 'J’en ai été témoin'],
  ['learned_about_it', 'Je l’ai appris'],
  ['part_of_work', 'Dans le cadre du travail'],
  ['not_applicable', 'Ne s’applique pas'],
  ['not_sure', 'Je ne suis pas sûr'],
]

const lec5Events: Array<[string, string]> = [
  ['LEC5-E01', '1. Catastrophe naturelle (inondation, ouragan, tornade, tremblement de terre, etc.)'],
  ['LEC5-E02', '2. Incendie ou explosion'],
  ['LEC5-E03', '3. Accident de la route (voiture, bateau, déraillement de train, écrasement d’avion, etc.)'],
  ['LEC5-E04', '4. Accident grave au travail, à domicile ou pendant des loisirs'],
  ['LEC5-E05', '5. Exposition à une substance toxique (produits chimiques dangereux, radiation, etc.)'],
  ['LEC5-E06', '6. Agression physique (attaqué, frappé, poignardé, battu, coups de pied, etc.)'],
  ['LEC5-E07', '7. Attaque à main armée (menacé ou blessé par une arme à feu, un couteau, une bombe, etc.)'],
  ['LEC5-E08', '8. Agression sexuelle (viol, tentative, acte sexuel par la force ou sous menaces)'],
  ['LEC5-E09', '9. Autre expérience sexuelle non désirée et désagréable (abus sexuel dans l’enfance)'],
  ['LEC5-E10', '10. Conflit armé ou présence en zone de guerre (dans l’armée ou comme civil)'],
  ['LEC5-E11', '11. Captivité (kidnappé, enlevé, pris en otage, incarcéré comme prisonnier de guerre, etc.)'],
  ['LEC5-E12', '12. Maladie ou blessure mettant la vie en danger'],
  ['LEC5-E13', '13. Souffrances humaines intenses'],
  ['LEC5-E14', '14. Mort violente (homicide, suicide, etc.)'],
  ['LEC5-E15', '15. Mort subite et accidentelle'],
  ['LEC5-E16', '16. Blessure grave, dommage ou mort causé par vous à quelqu’un'],
  ['LEC5-E17', '17. Toute autre expérience très stressante (négligence sévère dans l’enfance, etc.)'],
]

const itqLikert = {
  points: 5,
  minValue: 0,
  leftAnchor: 'Pas du tout',
  rightAnchor: 'Extrêmement',
  neutralLabel: 'Modérément',
}

const itqScaleHelper =
  'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement.'
const ptsdInstruction = `${itqScaleHelper} Indiquez à quel point vous avez été perturbé par ce problème le mois dernier.`
const dsoInstruction = `${itqScaleHelper} Répondez à quel point l’énoncé est vrai vous concernant.`

const lec5Questions: QuestionSeed[] = [
  {
    code: 'LEC5-INTRO',
    label: 'VOS EXPÉRIENCES — situations vécues (inventaire LEC-5)',
    responseType: 'information',
    isRequired: false,
    helperText:
      'Pour chaque situation, cochez la ou les cases correspondantes. Considérez l’ensemble de votre vie, de l’enfance à l’âge adulte.',
  },
  ...lec5Events.map(([code, label]) => ({
    code,
    label,
    responseType: 'multiple_choice' as const,
    isRequired: false,
    helperText: 'Plusieurs modalités d’exposition peuvent être cochées.',
    options: lec5ExposureOptions,
  })),
  {
    code: 'LEC5-WORST',
    label: 'Quelle situation fut la plus difficile pour vous ?',
    responseType: 'single_choice',
    isRequired: false,
    helperText: 'Sélectionnez la situation la plus difficile sur l’ensemble de votre vie.',
    options: [
      ...lec5Events,
      ['LEC5-E18', '18. Autre expérience précisée ci-dessous'],
    ],
  },
  {
    code: 'LEC5-OTHER',
    label: '18. Autre (précisez)',
    responseType: 'free_text_short',
    isRequired: false,
    helperText:
      'Champ facultatif. Évitez les noms, dates exactes, lieux précis ou détails directement identifiants.',
  },
]

const itqQuestions: QuestionSeed[] = [
  {
    code: 'ITQ-EXP-DESC',
    label: 'Description de l’expérience qui vous perturbe le plus',
    responseType: 'free_text_long',
    isRequired: false,
    helperText:
      'Évitez les noms, emails, téléphones ou toute autre information directement identifiante.',
  },
  {
    code: 'ITQ-EXP-DATE',
    label: 'Quand l’expérience s’est-elle passée ?',
    responseType: 'single_choice',
    isRequired: true,
    helperText: 'Sélectionnez la période la plus proche.',
    options: [
      ['moins_6_mois', 'Il y a moins de 6 mois'],
      ['6_12_mois', '6 à 12 mois'],
      ['1_5_ans', '1 à 5 ans'],
      ['5_10_ans', '5 à 10 ans'],
      ['10_20_ans', '10 à 20 ans'],
      ['plus_20_ans', 'Il y a plus de 20 ans'],
    ],
  },
  likert('P1', 'Avoir des rêves perturbants où se rejoue une partie de l’expérience ou qui sont clairement en relation avec l’expérience ?', ptsdInstruction),
  likert('P2', 'Avoir des images ou des souvenirs forts qui viennent à l’esprit comme si l’expérience se rejoue ici et maintenant ?', ptsdInstruction),
  likert('P3', 'Éviter les ressentis qui rappellent l’expérience, par exemple pensées, sentiments ou sensations physiques ?', ptsdInstruction),
  likert('P4', 'Éviter les éléments extérieurs qui rappellent l’expérience, par exemple personnes, lieux, conversations, objets, activités ou situations ?', ptsdInstruction),
  likert('P5', 'Être en état de super-alerte, vigilance ou sur ses gardes ?', ptsdInstruction),
  likert('P6', 'Réaction exagérée de surprise ou sursaut ?', ptsdInstruction),
  likert('P7', 'Est-ce que cela a affecté vos relations et votre vie sociale ?', ptsdInstruction),
  likert('P8', 'Est-ce que cela a affecté votre travail ou votre capacité à travailler ?', ptsdInstruction),
  likert('P9', 'Est-ce que cela a affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?', ptsdInstruction),
  likert('C1', 'Quand je suis contrarié.e, il me faut beaucoup de temps pour me calmer', dsoInstruction),
  likert('C2', 'Je me sens insensible ou émotionnellement éteint.e', dsoInstruction),
  likert('C3', 'Je me sens nul.le', dsoInstruction),
  likert('C4', 'Je me sens sans valeur', dsoInstruction),
  likert('C5', 'Je me sens distant.e ou coupé.e des autres', dsoInstruction),
  likert('C6', 'Je trouve qu’il est difficile de rester émotionnellement proche des autres', dsoInstruction),
  likert('C7', 'Les problèmes ci-dessus créent-ils de l’inquiétude ou de la détresse concernant vos relations ou votre vie sociale ?', dsoInstruction),
  likert('C8', 'Les problèmes ci-dessus affectent-ils votre travail ou votre capacité à travailler ?', dsoInstruction),
  likert('C9', 'Les problèmes ci-dessus affectent-ils d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?', dsoInstruction),
]

function likert(code: string, label: string, helperText: string): QuestionSeed {
  return {
    code,
    label,
    responseType: 'likert',
    isRequired: true,
    helperText,
    likertScale: itqLikert,
  }
}

function questionCreateInput(seed: QuestionSeed, displayOrder: number) {
  return {
    code: seed.code,
    displayOrder,
    language: 'fr',
    label: seed.label,
    responseType: seed.responseType,
    isRequired: seed.isRequired,
    helperText: seed.helperText,
    tags: seed.code.startsWith('LEC5-') ? ['LEC5'] : ['ITQ'],
    ...(seed.options
      ? {
          answerOptions: {
            create: seed.options.map(([value, label], index) => ({
              value,
              label,
              displayOrder: index + 1,
            })),
          },
        }
      : {}),
    ...(seed.likertScale
      ? {
          likertScale: {
            create: {
              ...seed.likertScale,
              allowNotApplicable: false,
            },
          },
        }
      : {}),
  }
}

async function main() {
  await prisma.$connect()

  const organization = await prisma.organization.findUnique({ where: { code: organizationCode } })
  if (!organization) {
    throw new Error(`Organization ${organizationCode} not found. Run bootstrap:production first.`)
  }

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } })
  if (!owner || !owner.isActive || owner.organizationId !== organization.id) {
    throw new Error(`Active owner ${ownerEmail} not found in organization ${organizationCode}`)
  }
  if (!['admin', 'questionnaire_admin'].includes(owner.role)) {
    throw new Error('The questionnaire owner must have role admin or questionnaire_admin')
  }

  const existingQuestionnaire = await prisma.questionnaire.findUnique({
    where: { code: questionnaireCode },
    include: { versions: { where: { versionLabel }, include: { groups: true } } },
  })

  if (existingQuestionnaire && existingQuestionnaire.organizationId !== organization.id) {
    throw new Error(`Questionnaire code ${questionnaireCode} already belongs to another organization`)
  }

  const existingVersion = existingQuestionnaire?.versions[0]
  if (existingVersion) {
    if (existingVersion.groups.length !== 2) {
      throw new Error(
        `Version ${versionLabel} already exists but contains ${existingVersion.groups.length} groups instead of 2`,
      )
    }

    console.log(
      JSON.stringify({
        status: 'already_seeded',
        questionnaireCode,
        versionLabel,
        groupCount: existingVersion.groups.length,
      }),
    )
    return
  }

  const now = new Date()
  const questionnaire = await prisma.$transaction(async (tx: any) => {
    const record = existingQuestionnaire
      ? await tx.questionnaire.update({
          where: { id: existingQuestionnaire.id },
          data: {
            ownerUserId: owner.id,
            title: questionnaireTitle,
            description: 'Parcours client unique regroupant le LEC-5 et l’ITQ dans deux groupes.',
            defaultLanguage: 'fr',
            finality:
              'Repérer les événements de vie potentiellement traumatiques avec le LEC-5, puis recueillir les symptômes et retentissements associés avec l’ITQ.',
            status: 'published',
          },
        })
      : await tx.questionnaire.create({
          data: {
            organizationId: organization.id,
            ownerUserId: owner.id,
            code: questionnaireCode,
            title: questionnaireTitle,
            description: 'Parcours client unique regroupant le LEC-5 et l’ITQ dans deux groupes.',
            defaultLanguage: 'fr',
            finality:
              'Repérer les événements de vie potentiellement traumatiques avec le LEC-5, puis recueillir les symptômes et retentissements associés avec l’ITQ.',
            status: 'published',
          },
        })

    const version = await tx.questionnaireVersion.create({
      data: {
        questionnaireId: record.id,
        versionLabel,
        language: 'fr',
        status: 'published',
        description:
          'Version client de production : groupe 1 LEC-5, groupe 2 ITQ. Une question par page pour préserver la lisibilité.',
        finality: record.finality,
        openFrom: now,
        publishedAt: now,
        immutableAt: now,
        groups: {
          create: [
            {
              title: 'LEC-5 · Événements de vie',
              description:
                'Inventaire des situations difficiles ou stressantes vécues, observées, apprises ou rencontrées dans le cadre professionnel.',
              displayOrder: 1,
              questionsPerPage: 1,
              randomize: false,
              questions: {
                create: lec5Questions.map((seed, index) => questionCreateInput(seed, index + 1)),
              },
            },
            {
              title: 'ITQ · Symptômes et retentissement',
              description:
                'International Trauma Questionnaire : symptômes du dernier mois et perturbations dans l’organisation de soi.',
              displayOrder: 2,
              questionsPerPage: 1,
              randomize: false,
              questions: {
                create: itqQuestions.map((seed, index) => questionCreateInput(seed, index + 1)),
              },
            },
          ],
        },
      },
      include: { groups: { include: { questions: true } } },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: owner.id,
        organizationId: organization.id,
        action: 'questionnaire.seed.client_itq_lec5',
        entityType: 'QuestionnaireVersion',
        entityId: version.id,
        metadata: {
          nonce: randomBytes(8).toString('hex'),
          questionnaireCode,
          versionLabel,
          groupCount: version.groups.length,
          questionCount: version.groups.reduce(
            (total: number, group: { questions: unknown[] }) => total + group.questions.length,
            0,
          ),
        },
      },
    })

    return { record, version }
  })

  console.log(
    JSON.stringify({
      status: 'seeded',
      questionnaireCode: questionnaire.record.code,
      questionnaireTitle: questionnaire.record.title,
      versionLabel: questionnaire.version.versionLabel,
      groups: questionnaire.version.groups.map((group: any) => ({
        title: group.title,
        questionCount: group.questions.length,
      })),
    }),
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
