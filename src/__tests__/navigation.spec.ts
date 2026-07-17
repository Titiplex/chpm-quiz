import { describe, expect, it } from 'vitest'

import { defaultPathByRole, getVisibleNavigation, navigationItems } from '@/config/navigation'

describe('navigation ACL matrix', () => {
  it('keeps every declared navigation target documented and reachable by at least one role', () => {
    expect(
      navigationItems.every((item) => item.label && item.description && item.to.startsWith('/')),
    ).toBe(true)
    expect(navigationItems.every((item) => item.roles.length > 0)).toBe(true)
    expect(navigationItems.map((item) => item.to)).toContain('/terminaux')
  })

  it('limits moderator navigation to operational screens only', () => {
    const moderatorTargets = getVisibleNavigation('moderator').map((item) => item.to)

    expect(moderatorTargets).toEqual(['/', '/moderation', '/terminaux'])
    expect(moderatorTargets).not.toContain('/stats')
    expect(moderatorTargets).not.toContain('/coffre-email')
  })

  it('exposes project administration only to project admins and hides DPO business navigation', () => {
    const adminTargets = getVisibleNavigation('admin').map((item) => item.to)
    const siteManagerTargets = getVisibleNavigation('site_manager').map((item) => item.to)
    const dpoTargets = getVisibleNavigation('dpo').map((item) => item.to)

    expect(adminTargets).toContain('/administration-projet')
    expect(siteManagerTargets).not.toContain('/administration-projet')
    expect(dpoTargets).toEqual([])
  })

  it('sends specialized roles to their correct default landing pages', () => {
    expect(defaultPathByRole.questionnaire_admin).toBe('/admin')
    expect(defaultPathByRole.analyst).toBe('/stats')
    expect(defaultPathByRole.dpo).toBe('/')
    expect(defaultPathByRole.judicial_officer).toBe('/rgpd')
    expect(defaultPathByRole.technical_admin).toBe('/terminaux')
  })
})
