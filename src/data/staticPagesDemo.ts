export type StaticQuestionType =
  | 'likert'
  | 'single_choice'
  | 'multiple_choice'
  | 'free_text_long'
  | 'information'

export type StaticInvitationStatus = 'sent' | 'opened' | 'in_progress' | 'submitted'

export interface StaticBuilding {
  id: string
  label: string
  country: string
  city: string
}

export interface StaticPopup {
  id: string
  title: string
  body: string
}

export interface StaticLikertScale {
  points: number
  minValue: number
  leftAnchor: string
  rightAnchor: string
  labels: Record<number, string>
}

export interface StaticQuestionOption {
  value: string
  label: string
}

export interface StaticQuestion {
  id: string
  code: string
  type: StaticQuestionType
  label: string
  helperText?: string
  isRequired?: boolean
  likertScale?: StaticLikertScale
  options?: StaticQuestionOption[]
  popup?: StaticPopup
}

export interface StaticQuestionGroup {
  id: string
  title: string
  description: string
  questionsPerPage: number
  questions: StaticQuestion[]
}

export interface StaticQuestionnaire {
  code: string
  title: string
  versionLabel: string
  finality: string
  estimatedDuration: string
  publicCode: string
  buildingLabel: string
  groups: StaticQuestionGroup[]
}

export interface StaticInvitation {
  publicCode: string
  destination: string
  channel: string
  questionnaireTitle: string
  buildingLabel: string
  status: StaticInvitationStatus
  sentAt: string
}

export const staticBuildings: StaticBuilding[] = [
  {
    id: 'montfavet-a',
    label: 'CHPM · Bâtiment A',
    country: 'France',
    city: 'Montfavet',
  },
  {
    id: 'montfavet-b',
    label: 'CHPM · Bâtiment B',
    country: 'France',
    city: 'Montfavet',
  },
]

const agreementScale: StaticLikertScale = {
  points: 7,
  minValue: 1,
  leftAnchor: 'Pas du tout d’accord',
  rightAnchor: 'Tout à fait d’accord',
  labels: {
    1: 'Pas du tout',
    2: 'Très peu',
    3: 'Plutôt non',
    4: 'Neutre',
    5: 'Plutôt oui',
    6: 'Fortement',
    7: 'Tout à fait',
  },
}

const frequencyScale: StaticLikertScale = {
  points: 7,
  minValue: 1,
  leftAnchor: 'Jamais',
  rightAnchor: 'Toujours',
  labels: {
    1: 'Jamais',
    2: 'Rarement',
    3: 'Parfois',
    4: 'Moyen',
    5: 'Souvent',
    6: 'Très souvent',
    7: 'Toujours',
  },
}

export const staticQuestionnaire: StaticQuestionnaire = {
  code: 'CHPM-PATIENT-STATIC',
  title: 'Questionnaire patient · compréhension et vécu de prise en charge',
  versionLabel: 'démo-statique-1.0',
  finality:
    'Cette démonstration illustre le parcours répondant sans compte, sans backend et sans donnée réelle.',
  estimatedDuration: '3 à 5 minutes',
  publicCode: 'DEMO-PATIENT-001',
  buildingLabel: 'CHPM · Bâtiment A',
  groups: [
    {
      id: 'notice',
      title: 'Notice et contexte',
      description:
        'Cette première page présente le cadre de passation et vérifie que le patient comprend le contexte.',
      questionsPerPage: 2,
      questions: [
        {
          id: 'q-info-rgpd',
          code: 'INFO-RGPD',
          type: 'information',
          label: 'Vos réponses sont pseudonymisées dans la démonstration.',
          helperText:
            'Aucune réponse de cette page GitHub Pages n’est envoyée à un serveur. Le formulaire sert uniquement à valider l’ergonomie.',
        },
        {
          id: 'q-comprehension-notice',
          code: 'Q-NOTICE-01',
          type: 'likert',
          label: 'La notice d’information est claire et compréhensible.',
          helperText: 'Choisissez le niveau d’accord qui correspond le mieux à votre ressenti.',
          isRequired: true,
          likertScale: agreementScale,
          popup: {
            id: 'popup-notice',
            title: 'Notice d’information',
            body: 'Texte court expliquant la finalité, la durée, la confidentialité et les droits du répondant avant la passation.',
          },
        },
      ],
    },
    {
      id: 'experience',
      title: 'Expérience de réponse',
      description:
        'Ces questions servent à tester les échelles, les explications et les champs libres.',
      questionsPerPage: 2,
      questions: [
        {
          id: 'q-orientation',
          code: 'Q-ERG-01',
          type: 'likert',
          label: 'Les libellés au-dessus des boutons m’aident à choisir ma réponse.',
          helperText:
            'Les boutons Likert affichent une valeur numérique et un label court pour éviter les ambiguïtés.',
          isRequired: true,
          likertScale: agreementScale,
        },
        {
          id: 'q-frequence-aide',
          code: 'Q-AIDE-01',
          type: 'likert',
          label: 'J’ai besoin d’une aide extérieure pour comprendre certaines questions.',
          helperText: 'Répondez selon votre ressenti global pendant la lecture du questionnaire.',
          isRequired: true,
          likertScale: frequencyScale,
          popup: {
            id: 'popup-aide',
            title: 'Aide extérieure',
            body: 'Il peut s’agir d’une aide technique, d’une reformulation par un professionnel ou d’un accompagnement par un proche.',
          },
        },
        {
          id: 'q-canal',
          code: 'Q-CANAL-01',
          type: 'single_choice',
          label: 'Quel canal de passation vous semblerait le plus confortable ? ',
          isRequired: true,
          options: [
            { value: 'email', label: 'Lien reçu par email' },
            { value: 'terminal', label: 'Terminal disponible dans le bâtiment' },
            { value: 'papier', label: 'Questionnaire papier accompagné' },
          ],
        },
        {
          id: 'q-commentaire',
          code: 'Q-LIBRE-01',
          type: 'free_text_long',
          label: 'Avez-vous une remarque sur la clarté du questionnaire ? ',
          helperText:
            'Ne saisissez pas de nom, numéro de téléphone, email ou information directement identifiante.',
        },
      ],
    },
  ],
}

export const staticInvitations: StaticInvitation[] = [
  {
    publicCode: 'DEMO-PATIENT-001',
    destination: 'p••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'in_progress',
    sentAt: '2026-06-24 09:15',
  },
  {
    publicCode: 'DEMO-PATIENT-002',
    destination: 'Terminal accueil · Bâtiment A',
    channel: 'Terminal hospitalier',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'submitted',
    sentAt: '2026-06-24 10:40',
  },
  {
    publicCode: 'DEMO-PATIENT-003',
    destination: 'm••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment B',
    status: 'opened',
    sentAt: '2026-06-24 14:05',
  },
  {
    publicCode: 'DEMO-PATIENT-004',
    destination: 'n••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'sent',
    sentAt: '2026-06-25 08:25',
  },
]
