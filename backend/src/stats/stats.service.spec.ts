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
})
