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

const itqScale: StaticLikertScale = {
  points: 5,
  minValue: 0,
  leftAnchor: 'Pas du tout',
  rightAnchor: 'Extrêmement',
  labels: {
    0: 'Pas du tout',
    1: 'Un petit peu',
    2: 'Modérément',
    3: 'Beaucoup',
    4: 'Extrêmement',
  },
}

const ptsdInstruction =
  'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement. Indiquez à quel point vous avez été perturbé par ce problème le mois dernier.'
const dsoInstruction =
  'Échelle ITQ : 0 = Pas du tout, 1 = Un petit peu, 2 = Modérément, 3 = Beaucoup, 4 = Extrêmement. Répondez à quel point l’énoncé est vrai vous concernant.'

function itqQuestion(
  code: string,
  label: string,
  helperText: string,
  popupTitle: string,
  popupBody: string,
): StaticQuestion {
  return {
    id: `static-q-itq-${code.toLowerCase()}`,
    code,
    type: 'likert',
    label,
    helperText,
    isRequired: true,
    likertScale: itqScale,
    popup: {
      id: `itq-${code.toLowerCase()}`,
      title: popupTitle,
      body: popupBody,
    },
  }
}

export const staticQuestionnaire: StaticQuestionnaire = {
  code: 'ITQ-CN2R',
  title: 'International Trauma Questionnaire (ITQ)',
  versionLabel: '1.0-cn2r',
  finality:
    'Version française de l’International Trauma Questionnaire : auto-questionnaire adulte lié au TSPT et au TSPT complexe selon la CIM-11. Cette démonstration ne remplace pas une interprétation clinique qualifiée.',
  estimatedDuration: '8 à 10 minutes',
  publicCode: 'ITQ-0001',
  buildingLabel: 'CHPM · Bâtiment A',
  groups: [
    {
      id: 'itq-contexte',
      title: 'Contexte de l’expérience',
      description:
        'Merci d’indiquer quelle est l’expérience qui vous perturbe le plus et de répondre aux questions par rapport à cette expérience.',
      questionsPerPage: 1,
      questions: [
        {
          id: 'static-q-itq-exp-desc',
          code: 'ITQ-EXP-DESC',
          type: 'free_text_long',
          label: 'Description de l’expérience',
          helperText:
            'Champ libre de contexte. Évitez les noms, emails, téléphones ou toute autre information directement identifiante.',
          popup: {
            id: 'experience-perturbante',
            title: 'Expérience qui perturbe le plus',
            body: 'Dans l’ITQ, les réponses doivent être données par rapport à l’expérience stressante ou traumatique qui vous perturbe le plus. Évitez d’indiquer des détails directement identifiants.',
          },
        },
        {
          id: 'static-q-itq-exp-date',
          code: 'ITQ-EXP-DATE',
          type: 'single_choice',
          label: 'Quand l’expérience s’est-elle passée ?',
          helperText:
            'Sélectionnez la période la plus proche, sans ajouter de date précise si elle permettrait de vous identifier.',
          isRequired: true,
          options: [
            { value: 'moins_6_mois', label: 'Il y a moins de 6 mois' },
            { value: '6_12_mois', label: '6 à 12 mois' },
            { value: '1_5_ans', label: '1 à 5 ans' },
            { value: '5_10_ans', label: '5 à 10 ans' },
            { value: '10_20_ans', label: '10 à 20 ans' },
            { value: 'plus_20_ans', label: 'Il y a plus de 20 ans' },
          ],
          popup: {
            id: 'periode-experience',
            title: 'Période de l’expérience',
            body: 'Cette question situe approximativement l’ancienneté de l’expérience. Choisissez la période la plus proche, sans ajouter de date précise si elle permettrait de vous identifier.',
          },
        },
      ],
    },
    {
      id: 'itq-tspt-symptomes',
      title: 'TSPT · Symptômes du dernier mois',
      description:
        'Merci de lire chaque item attentivement, puis d’indiquer à quel point vous avez été perturbé par ce problème le mois dernier.',
      questionsPerPage: 1,
      questions: [
        itqQuestion(
          'P1',
          'Avoir des rêves perturbants où se rejoue une partie de l’expérience ou qui sont clairement en relation avec l’expérience ?',
          ptsdInstruction,
          'Rêves perturbants · Revivre l’expérience',
          'Cet item fait partie de la dimension “Revivre l’expérience” de l’ITQ. Il concerne les rêves perturbants où une partie de l’expérience se rejoue ou qui sont clairement en relation avec elle.',
        ),
        itqQuestion(
          'P2',
          'Avoir des images ou des souvenirs forts qui viennent à l’esprit comme si l’expérience se rejoue ici et maintenant ?',
          ptsdInstruction,
          'Images ou souvenirs forts · Revivre l’expérience',
          'Cet item vise les images ou souvenirs intenses qui surviennent comme si l’expérience se rejouait ici et maintenant.',
        ),
        itqQuestion(
          'P3',
          'Éviter les ressentis qui rappellent l’expérience, par exemple pensées, sentiments ou sensations physiques ?',
          ptsdInstruction,
          'Éviter les ressentis · Évitement',
          'Cet item concerne l’évitement de rappels internes de l’expérience, par exemple des pensées, sentiments ou sensations physiques.',
        ),
        itqQuestion(
          'P4',
          'Éviter les éléments extérieurs qui rappellent l’expérience, par exemple personnes, lieux, conversations, objets, activités ou situations ?',
          ptsdInstruction,
          'Éléments extérieurs · Évitement',
          'Cet item concerne l’évitement de rappels extérieurs de l’expérience, comme des lieux, conversations, objets, activités ou situations.',
        ),
        itqQuestion(
          'P5',
          'Être en état de super-alerte, vigilance ou sur ses gardes ?',
          ptsdInstruction,
          'Super-alerte / vigilance · Sentiment de menace',
          'Cet item correspond au fait de rester en hypervigilance, sur ses gardes ou en état de super-alerte.',
        ),
        itqQuestion(
          'P6',
          'Réaction exagérée de surprise ou sursaut ?',
          ptsdInstruction,
          'Sursaut · Sentiment de menace',
          'Cet item concerne les réactions de surprise ou de sursaut exagérées.',
        ),
      ],
    },
    {
      id: 'itq-tspt-retentissement',
      title: 'TSPT · Retentissement fonctionnel',
      description:
        'Au cours du dernier mois, les symptômes ci-dessus ont-ils affecté votre fonctionnement ?',
      questionsPerPage: 1,
      questions: [
        itqQuestion(
          'P7',
          'Est-ce que cela a affecté vos relations et votre vie sociale ?',
          ptsdInstruction,
          'Relations et vie sociale · Retentissement',
          'Cet item évalue l’impact des symptômes sur les relations et la vie sociale.',
        ),
        itqQuestion(
          'P8',
          'Est-ce que cela a affecté votre travail ou votre capacité à travailler ?',
          ptsdInstruction,
          'Travail ou capacité à travailler · Retentissement',
          'Cet item évalue l’impact des symptômes sur le travail ou la capacité à travailler.',
        ),
        itqQuestion(
          'P9',
          'Est-ce que cela a affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?',
          ptsdInstruction,
          'Autres activités importantes · Retentissement',
          'Cet item évalue l’impact sur les enfants, les études ou d’autres activités importantes.',
        ),
      ],
    },
    {
      id: 'itq-pos',
      title: 'Perturbations dans l’organisation de soi',
      description:
        'Les questions suivantes se rapportent à la manière dont vous vous sentez typiquement, pensez de vous-même typiquement, ou êtes typiquement en relation avec les autres.',
      questionsPerPage: 1,
      questions: [
        itqQuestion(
          'C1',
          'Quand je suis contrarié.e, il me faut beaucoup de temps pour me calmer',
          dsoInstruction,
          'Régulation émotionnelle',
          'Cet item concerne la difficulté à retrouver son calme lorsqu’on est contrarié.',
        ),
        itqQuestion(
          'C2',
          'Je me sens insensible ou émotionnellement éteint.e',
          dsoInstruction,
          'Insensibilité émotionnelle · Régulation émotionnelle',
          'Cet item concerne le fait de se sentir insensible ou émotionnellement éteint.',
        ),
        itqQuestion(
          'C3',
          'Je me sens nul.le',
          dsoInstruction,
          'Perception de soi négative',
          'Cet item concerne le fait de se sentir nul.le.',
        ),
        itqQuestion(
          'C4',
          'Je me sens sans valeur',
          dsoInstruction,
          'Sans valeur · Perception de soi négative',
          'Cet item concerne le fait de se sentir sans valeur.',
        ),
        itqQuestion(
          'C5',
          'Je me sens distant.e ou coupé.e des autres',
          dsoInstruction,
          'Distance avec les autres · Relations',
          'Cet item concerne le sentiment d’être distant.e ou coupé.e des autres.',
        ),
        itqQuestion(
          'C6',
          'Je trouve qu’il est difficile de rester émotionnellement proche des autres',
          dsoInstruction,
          'Proximité émotionnelle · Relations',
          'Cet item concerne la difficulté à rester émotionnellement proche des autres.',
        ),
      ],
    },
    {
      id: 'itq-pos-retentissement',
      title: 'Perturbations dans l’organisation de soi · Retentissement fonctionnel',
      description:
        'Au cours du dernier mois, les problèmes ci-dessus relatifs à vos émotions, aux croyances sur vous-même et dans vos relations ont-ils eu un retentissement ?',
      questionsPerPage: 1,
      questions: [
        itqQuestion(
          'C7',
          'Créé de l’inquiétude ou de la détresse concernant vos relations ou votre vie sociale ?',
          dsoInstruction,
          'Retentissement relationnel · POS',
          'Cet item évalue l’inquiétude ou la détresse concernant les relations ou la vie sociale.',
        ),
        itqQuestion(
          'C8',
          'Affecté votre travail ou capacité à travailler ?',
          dsoInstruction,
          'Retentissement professionnel · POS',
          'Cet item évalue l’impact sur le travail ou la capacité à travailler.',
        ),
        itqQuestion(
          'C9',
          'Affecté d’autres parties importantes de votre vie telles que la capacité à s’occuper de vos enfants, vos études, ou toutes autres activités importantes ?',
          dsoInstruction,
          'Retentissement sur les activités · POS',
          'Cet item évalue l’impact sur les enfants, les études ou d’autres activités importantes.',
        ),
      ],
    },
  ],
}

export const staticInvitations: StaticInvitation[] = [
  {
    publicCode: 'ITQ-0001',
    destination: 'i••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'in_progress',
    sentAt: '2026-06-24 09:15',
  },
  {
    publicCode: 'ITQ-MA-002',
    destination: 'Terminal accueil · Bâtiment A',
    channel: 'Terminal hospitalier',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'submitted',
    sentAt: '2026-06-24 10:40',
  },
  {
    publicCode: 'ITQ-MB-003',
    destination: 'm••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment B',
    status: 'opened',
    sentAt: '2026-06-24 14:05',
  },
  {
    publicCode: 'ITQ-SMS-003',
    destination: '•••• 0000',
    channel: 'SMS simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment B',
    status: 'opened',
    sentAt: '2026-06-24 14:05',
  },
  {
    publicCode: 'ITQ-MA-004',
    destination: 'n••••••@exemple.org',
    channel: 'Email simulé',
    questionnaireTitle: staticQuestionnaire.title,
    buildingLabel: 'CHPM · Bâtiment A',
    status: 'sent',
    sentAt: '2026-06-25 08:25',
  },
]
