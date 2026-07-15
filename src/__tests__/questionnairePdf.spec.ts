import { describe, expect, it, vi } from 'vitest'

import { createQuestionnairePdfBlob, downloadQuestionnairePdf } from '@/services/questionnairePdf'
import { questionnaireFixture } from './fixtures/api'
import type { ApiQuestion, ApiQuestionnaire } from '@shared/types/api'
import type { QuestionType } from '@shared/types/domain'

function makeQuestion(
  code: string,
  type: QuestionType,
  overrides: Partial<ApiQuestion> = {},
): ApiQuestion {
  return {
    id: `question-${code}`,
    code,
    title: `Question ${code}`,
    label: `Question ${code}`,
    type,
    responseType: type,
    answerScaleLabel: 'Réponse attendue',
    helperText: null,
    displayOrder: Number.parseInt(code.replace(/\D/g, ''), 10) || 1,
    isRequired: false,
    likertScale: null,
    options: [],
    popupDefinitions: [],
    ...overrides,
  }
}

function makeRichQuestionnaire(): ApiQuestionnaire {
  const questions: ApiQuestion[] = [
    makeQuestion('L1', 'likert', {
      label: 'Évaluez ce symptôme (0 à 4) \\ avec € et ✓',
      helperText: 'Choisissez une seule réponse — même si la situation paraît ambiguë.',
      isRequired: true,
      likertScale: {
        id: 'scale-1',
        points: 5,
        minValue: 0,
        leftAnchor: 'Pas du tout',
        rightAnchor: 'Extrêmement',
        neutralLabel: 'Modérément',
        allowNotApplicable: true,
        orientation: 'horizontal',
      },
    }),
    makeQuestion('S1', 'single_choice', {
      options: [
        { id: 'option-1', value: 'yes', label: 'Oui', displayOrder: 1 },
        { id: 'option-2', value: 'no', label: 'Non', displayOrder: 2 },
      ],
    }),
    makeQuestion('M1', 'multiple_choice', {
      options: [
        { id: 'option-3', value: 'a', label: 'Choix A', displayOrder: 1 },
        { id: 'option-4', value: 'b', label: 'Choix B', displayOrder: 2 },
      ],
    }),
    makeQuestion('N1', 'number'),
    makeQuestion('D1', 'date'),
    makeQuestion('I1', 'information'),
    makeQuestion('T1', 'free_text_long', {
      label: 'Décrivez librement la situation observée et les éléments utiles à sa compréhension.',
    }),
  ]

  for (let index = 0; index < 18; index += 1) {
    questions.push(makeQuestion(`INFO${index + 2}`, 'information'))
  }

  return {
    ...questionnaireFixture,
    title: 'Questionnaire « papier » — contrôle d’encodage € ✓ (test)',
    description: 'Description longue destinée à vérifier le retour à la ligne et la génération de plusieurs pages sans couper le contenu.',
    finality: 'Coordination clinique et validation du parcours papier',
    groupCount: 1,
    questionCount: questions.length,
    groups: [
      {
        id: 'group-rich',
        title: 'Groupe principal',
        description: 'Toutes les familles de réponses sont représentées.',
        displayOrder: 1,
        questionsPerPage: 1,
        randomize: false,
        questions,
      },
    ],
  }
}

describe('questionnairePdf', () => {
  it('builds a multi-page PDF covering every paper response format', async () => {
    const blob = createQuestionnairePdfBlob({
      questionnaire: makeRichQuestionnaire(),
      publicCode: ' ITQ Été / 2026 ',
      buildingLabel: 'Bâtiment A',
      generatedBy: 'Modérateur terrain',
    })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(5_000)

    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe('%PDF-1.4')
    expect(new TextDecoder().decode(bytes.slice(-5))).toBe('%%EOF')
  })

  it('builds a minimal blank PDF and falls back to question.type', () => {
    const questionnaire: ApiQuestionnaire = {
      ...questionnaireFixture,
      code: '',
      title: '',
      description: null,
      finality: null,
      groupCount: 1,
      questionCount: 1,
      groups: [
        {
          id: 'group-minimal',
          title: '',
          description: null,
          displayOrder: 1,
          randomize: false,
          questions: [
            makeQuestion('L2', 'likert', {
              responseType: undefined,
              label: undefined,
              title: '',
              likertScale: {
                id: 'scale-2',
                points: 4,
                leftAnchor: '',
                rightAnchor: '',
                neutralLabel: null,
                allowNotApplicable: false,
                orientation: 'vertical',
              },
            }),
          ],
        },
      ],
    }

    const blob = createQuestionnairePdfBlob({ questionnaire })

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(1_000)
  })

  it('downloads with the sanitized default filename', () => {
    const questionnaire = {
      ...questionnaireFixture,
      code: ' Été / ITQ ',
    }
    const createObjectURL = vi.fn(() => 'blob:questionnaire')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    let downloadedFileName = ''
    let downloadedHref = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download
      downloadedHref = this.href
    })

    downloadQuestionnairePdf({ questionnaire, publicCode: ' Papier 001 ' })

    expect(click).toHaveBeenCalledOnce()
    expect(downloadedFileName).toBe('ete-itq-papier-001.pdf')
    expect(downloadedHref).toBe('blob:questionnaire')
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:questionnaire')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('honours an explicit filename for a blank questionnaire', () => {
    const createObjectURL = vi.fn(() => 'blob:custom')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    let downloadedFileName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download
    })

    downloadQuestionnairePdf({
      questionnaire: questionnaireFixture,
      fileName: 'questionnaire-impression.pdf',
    })

    expect(downloadedFileName).toBe('questionnaire-impression.pdf')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:custom')
  })
})
