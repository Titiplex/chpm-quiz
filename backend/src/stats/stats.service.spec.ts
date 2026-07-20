import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { StatsService } from './stats.service'

function makeService(threshold = '5') {
  return new StatsService({} as any, { get: (_key: string, defaultValue?: string) => threshold ?? defaultValue } as any) as any
}

describe('StatsService disclosure controls', () => {
  it('masks building details below the minimum aggregation threshold', () => {
    const service = makeService('3')
    const invitations = [
      { buildingId: 'b1', building: { label: 'Bâtiment A' }, status: 'submitted', responseSession: { id: 's1' } },
      { buildingId: 'b1', building: { label: 'Bâtiment A' }, status: 'sent', responseSession: null },
      { buildingId: 'b2', building: { label: 'Bâtiment B' }, status: 'submitted', responseSession: { id: 's2' } },
      { buildingId: 'b2', building: { label: 'Bâtiment B' }, status: 'submitted', responseSession: { id: 's3' } },
      { buildingId: 'b2', building: { label: 'Bâtiment B' }, status: 'submitted', responseSession: { id: 's4' } },
    ]

    const rows = service.buildingBreakdown(invitations)

    expect(rows.find((row: any) => row.buildingId === 'b1')).toMatchObject({
      effectifSufficient: false,
      invited: null,
      submitted: null,
      displayValue: 'effectif insuffisant',
    })
    expect(rows.find((row: any) => row.buildingId === 'b2')).toMatchObject({
      effectifSufficient: true,
      invited: 3,
      submitted: 3,
      completionRate: 100,
    })
  })

  it('masks question answer counts, popup opens and durations below threshold', () => {
    const service = makeService('2')
    const versions = [
      {
        groups: [
          {
            questions: [
              {
                id: 'q1',
                code: 'P1',
                label: 'Question sous seuil',
                responseType: 'likert',
                answers: [{ isDraft: false }],
                telemetryEvents: [{ eventType: 'page_change', durationMs: 4500 }],
                popupDefinitions: [{ telemetryEvents: [{ eventType: 'popup_open' }] }],
              },
              {
                id: 'q2',
                code: 'P2',
                label: 'Question exploitable',
                responseType: 'likert',
                answers: [{ isDraft: false }, { isDraft: false }],
                telemetryEvents: [{ eventType: 'page_change', durationMs: 4000 }, { eventType: 'page_change', durationMs: 6000 }],
                popupDefinitions: [{ telemetryEvents: [{ eventType: 'popup_open' }, { eventType: 'popup_open' }] }],
              },
            ],
          },
        ],
      },
    ]

    const rows = service.questionBreakdown(versions)

    expect(rows[0]).toMatchObject({
      answerCount: null,
      popupOpens: null,
      medianDurationMs: null,
      displayValue: 'effectif insuffisant',
    })
    expect(rows[1]).toMatchObject({
      answerCount: 2,
      popupOpens: 2,
      medianDurationMs: 5000,
      displayValue: '2 réponse(s)',
    })
  })

  it('keeps every authorized free-text response instead of truncating the table payload', () => {
    const service = makeService('1')
    const answers = Array.from({ length: 40 }, (_, index) => ({
      value: `Réponse ${index + 1}`,
      identifiabilityWarning: false,
      warningReason: null,
      responseSession: { publicCode: `CODE-${index + 1}` },
    }))

    const rows = service.freeTextResponses(answers)

    expect(rows).toHaveLength(40)
    expect(rows.at(-1)).toMatchObject({ publicCode: 'CODE-40', value: 'Réponse 40' })
  })

  it('aggregates refusals and no-digital-contact field tracking separately from submissions', () => {
    const service = makeService('1')
    const rows = service.fieldTrackingBreakdown([
      { deliveryMode: 'email_simulation', status: 'sent' },
      { deliveryMode: 'onsite_terminal', status: 'submitted' },
      { deliveryMode: 'paper_form', status: 'sent' },
      { deliveryMode: 'refusal_record', status: 'cancelled' },
    ])

    expect(rows).toMatchObject({
      approached: 4,
      invited: 3,
      refused: 1,
      refusalRate: 25,
      noDigitalContact: 2,
      noDigitalContactRate: 67,
      onsiteTerminal: 1,
      paperForms: 1,
      digitalContact: 1,
      pendingWithoutDigitalContact: 1,
    })
  })

  it('applies the disclosure threshold to every demographic and delivery segment', () => {
    const service = makeService('2')
    const invitation = {
      buildingId: 'b1',
      building: { label: 'Building A', site: { id: 's1', name: 'Site A' } },
      status: 'submitted',
      deliveryMode: 'email',
      responseSession: { id: 'session-1' },
    }

    expect(service.versionStats({
      id: 'v1',
      versionLabel: '1.0',
      status: 'published',
      invitations: [invitation],
      submissions: [{}],
    })).toMatchObject({ effectifSufficient: false, invited: null, submissionRate: null })
    expect(service.siteBreakdown([invitation])[0]).toMatchObject({
      effectifSufficient: false,
      invited: null,
      submissionRate: null,
    })
    expect(service.deliveryModeBreakdown([invitation])[0]).toMatchObject({
      effectifSufficient: false,
      submitted: null,
      openingRate: null,
    })
    expect(service.languageBreakdown([{
      language: 'fr',
      invitations: [invitation],
      submissions: [{}],
    }])[0]).toMatchObject({ effectifSufficient: false, submitted: null, submissionRate: null })
  })

  it('masks field-tracking counts when too few people were approached', () => {
    const service = makeService('3')
    expect(service.fieldTrackingBreakdown([
      { deliveryMode: 'refusal_record', status: 'cancelled' },
      { deliveryMode: 'paper_form', status: 'sent' },
    ])).toMatchObject({
      effectifSufficient: false,
      approached: null,
      refused: null,
      refusalRate: null,
    })
  })

})
