import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import {
  assertCanAccessBuilding,
  assertCanAccessQuestionnaire,
  assertCanAccessVersion,
  canAccessBuilding,
  canAccessQuestionnaire,
  canAccessVersion,
  sameOrganizationOrUnscoped,
} from './access-scope'

const baseUser = {
  id: 'user-1',
  email: 'u@example.test',
  displayName: 'User',
  role: 'admin',
  organizationId: 'org-1',
  siteId: null,
  buildingId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  isActive: true,
  building: null,
} as any

describe('access scope helpers', () => {
  it('grants building access according to moderator, site and organization scopes', () => {
    const building = { id: 'building-1', siteId: 'site-1', organizationId: 'org-1' }

    expect(canAccessBuilding({ ...baseUser, role: 'moderator', buildingId: 'building-1' }, building)).toBe(true)
    expect(canAccessBuilding({ ...baseUser, role: 'moderator', buildingId: 'other' }, building)).toBe(false)
    expect(canAccessBuilding({ ...baseUser, role: 'site_manager', siteId: 'site-1' }, building)).toBe(true)
    expect(canAccessBuilding({ ...baseUser, role: 'site_manager', siteId: 'other' }, building)).toBe(false)
    expect(canAccessBuilding({ ...baseUser, role: 'dpo' }, building)).toBe(true)
    expect(canAccessBuilding({ ...baseUser, role: 'respondent' }, building)).toBe(false)
  })

  it('throws explicit scope errors for buildings', () => {
    expect(() => assertCanAccessBuilding({ ...baseUser, role: 'moderator', buildingId: 'other' }, { id: 'building-1' })).toThrow(ForbiddenException)
  })

  it('grants questionnaire access to global, owner and operational roles inside organization', () => {
    const questionnaire = { id: 'questionnaire-1', organizationId: 'org-1', ownerUserId: 'owner-1' }

    expect(canAccessQuestionnaire({ ...baseUser, role: 'admin' }, questionnaire)).toBe(true)
    expect(canAccessQuestionnaire({ ...baseUser, role: 'questionnaire_admin', id: 'owner-1', organizationId: 'org-x' }, questionnaire)).toBe(true)
    expect(canAccessQuestionnaire({ ...baseUser, role: 'site_manager' }, questionnaire)).toBe(true)
    expect(canAccessQuestionnaire({ ...baseUser, role: 'respondent' }, questionnaire)).toBe(false)
    expect(canAccessQuestionnaire({ ...baseUser, role: 'admin', organizationId: 'org-2' }, questionnaire)).toBe(false)
  })

  it('throws not found for inaccessible questionnaires and versions', () => {
    const user = { ...baseUser, role: 'respondent' }

    expect(() => assertCanAccessQuestionnaire(user, { id: 'q1', organizationId: 'org-1' })).toThrow(NotFoundException)
    expect(canAccessVersion(user, { id: 'v-empty', questionnaire: null })).toBe(false)
    expect(() => assertCanAccessVersion(user, { id: 'v1', questionnaire: { id: 'q1', organizationId: 'org-1' } })).toThrow(NotFoundException)
  })

  it('treats unscoped organizations as public and rejects cross-organization access', () => {
    expect(sameOrganizationOrUnscoped({ ...baseUser, organizationId: null }, null)).toBe(true)
    expect(sameOrganizationOrUnscoped({ ...baseUser, organizationId: null }, 'org-1')).toBe(false)
    expect(sameOrganizationOrUnscoped({ ...baseUser, organizationId: 'org-1' }, 'org-1')).toBe(true)
    expect(sameOrganizationOrUnscoped({ ...baseUser, organizationId: 'org-1' }, 'org-2')).toBe(false)
  })
})
