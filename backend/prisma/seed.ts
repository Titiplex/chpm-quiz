import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

type UserRole = 'admin' | 'moderator' | 'respondent'
type QuestionType = 'single_choice' | 'likert' | 'free_text' | 'information'

const prisma = new PrismaClient()

const userSeeds: Array<{
  email: string
  password: string
  displayName: string
  role: UserRole
  buildingCode?: string
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
  },
  {
    email: 'repondant@chpm.local',
    password: 'Respondent123!',
    displayName: 'Répondant démo',
    role: 'respondent',
    buildingCode: 'MTL-A',
  },
]

async function main() {
  await prisma.session.deleteMany()

  const buildings = await Promise.all([
    prisma.building.upsert({
      where: { code: 'MTL-A' },
      update: {
        label: 'Montréal · Bâtiment A',
        city: 'Montréal',
        country: 'Canada',
        timezone: 'America/Montreal',
      },
      create: {
        code: 'MTL-A',
        label: 'Montréal · Bâtiment A',
        city: 'Montréal',
        country: 'Canada',
        timezone: 'America/Montreal',
      },
    }),
    prisma.building.upsert({
      where: { code: 'PAR-C' },
      update: {
        label: 'Paris · Bâtiment C',
        city: 'Paris',
        country: 'France',
        timezone: 'Europe/Paris',
      },
      create: {
        code: 'PAR-C',
        label: 'Paris · Bâtiment C',
        city: 'Paris',
        country: 'France',
        timezone: 'Europe/Paris',
      },
    }),
    prisma.building.upsert({
      where: { code: 'TYO-H' },
      update: {
        label: 'Tokyo · Bâtiment H',
        city: 'Tokyo',
        country: 'Japon',
        timezone: 'Asia/Tokyo',
      },
      create: {
        code: 'TYO-H',
        label: 'Tokyo · Bâtiment H',
        city: 'Tokyo',
        country: 'Japon',
        timezone: 'Asia/Tokyo',
      },
    }),
  ])

  const buildingByCode = new Map(buildings.map((building) => [building.code, building]))

  for (const seed of userSeeds) {
    const passwordHash = await bcrypt.hash(seed.password, 12)
    const building = seed.buildingCode ? buildingByCode.get(seed.buildingCode) : undefined

    await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        passwordHash,
        displayName: seed.displayName,
        role: seed.role,
        isActive: true,
        buildingId: building?.id ?? null,
      },
      create: {
        email: seed.email,
        passwordHash,
        displayName: seed.displayName,
        role: seed.role,
        isActive: true,
        buildingId: building?.id,
      },
    })
  }

  await prisma.questionnaire.deleteMany({
    where: {
      code: {
        in: ['CHPM-BASE', 'CHPM-PILOT'],
      },
    },
  })

  await prisma.questionnaire.create({
    data: {
      code: 'CHPM-BASE',
      title: 'Questionnaire CHPM',
      version: '1.4',
      language: 'fr',
      isPublished: true,
      groups: {
        create: [
          {
            title: 'Accueil',
            description: 'Consentement, langue et contexte de passation.',
            displayOrder: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'Q-001',
                  1,
                  'Langue de passation souhaitée',
                  'single_choice',
                  'FR / EN / ES',
                  'Détermine automatiquement la langue des questions suivantes.',
                ),
                question(
                  'Q-002',
                  2,
                  'Confirmez-vous pouvoir répondre maintenant ?',
                  'single_choice',
                  'Oui / Non',
                  'Permet de reporter la passation si nécessaire.',
                ),
              ],
            },
          },
          {
            title: 'Compréhension clinique',
            description: 'Questions principales et signaux de compréhension.',
            displayOrder: 2,
            randomize: true,
            questions: {
              create: [
                question(
                  'Q-014',
                  1,
                  'Le terme “coordination inter-site” est-il clair pour vous ?',
                  'likert',
                  '7 points',
                  'Popup configurable : définition, exemples, contexte métier.',
                  'Coordination inter-site',
                  'Capacité des équipes de bâtiments différents à partager les informations nécessaires au bon déroulement du parcours.',
                ),
                question(
                  'Q-015',
                  2,
                  'Qu’est-ce qui rendrait cette formulation plus facile à comprendre ?',
                  'free_text',
                  'Texte long',
                  'Champ libre sauvegardé en brouillon avant soumission finale.',
                ),
              ],
            },
          },
          {
            title: 'Commentaires libres',
            description: 'Synthèse qualitative finale.',
            displayOrder: 3,
            randomize: false,
            questions: {
              create: [
                question(
                  'Q-027',
                  1,
                  'Décrivez les difficultés rencontrées pendant le test.',
                  'free_text',
                  'Texte long',
                  'Champ libre avec brouillon sauvegardé avant soumission.',
                ),
              ],
            },
          },
        ],
      },
    },
  })

  await prisma.questionnaire.create({
    data: {
      code: 'CHPM-PILOT',
      title: 'Questionnaire pilote',
      version: '0.9',
      language: 'fr',
      isPublished: false,
      groups: {
        create: [
          {
            title: 'Pilote',
            description: 'Version de test non publiée.',
            displayOrder: 1,
            randomize: false,
            questions: {
              create: [
                question(
                  'P-001',
                  1,
                  'Question pilote de validation',
                  'information',
                  'Information',
                  'Visible uniquement pour les administrateurs.',
                ),
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seed terminé. Comptes de démonstration :')
  for (const user of userSeeds) {
    console.log(`- ${user.email} / ${user.password}`)
  }
}

function question(
  code: string,
  displayOrder: number,
  title: string,
  type: QuestionType,
  answerScaleLabel: string,
  helperText?: string,
  popupTerm?: string,
  popupBody?: string,
) {
  return {
    code,
    displayOrder,
    title,
    type,
    answerScaleLabel,
    helperText,
    popupTerm,
    popupBody,
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
