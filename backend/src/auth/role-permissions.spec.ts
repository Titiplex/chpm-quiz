import { describe, expect, it } from 'vitest'

import { activeOperationalRoles, activeRoleHierarchy, adminLikeRoles, auditRoles, canDelegateRole, isActiveOperationalRole, roleInheritsFrom, roleProfiles, statisticsRoles, userRoles } from './role-permissions'

describe('role permission profiles', () => {
  it('defines one complete profile for every role', () => {
    expect(Object.keys(roleProfiles).sort()).toEqual([...userRoles].sort())
    for (const role of userRoles) {
      expect(roleProfiles[role]).toMatchObject({ label: expect.any(String), rank: expect.any(Number), permissions: expect.any(Array) })
    }
  })

  it('models active operational hierarchy and delegation', () => {
    expect(activeOperationalRoles).toEqual(['admin', 'site_manager', 'moderator'])
    expect(activeRoleHierarchy.map((profile) => profile.rank)).toEqual([300, 200, 100])
    expect(isActiveOperationalRole('admin')).toBe(true)
    expect(isActiveOperationalRole('dpo')).toBe(false)
    expect(canDelegateRole('admin', 'site_manager')).toBe(true)
    expect(canDelegateRole('site_manager', 'moderator')).toBe(true)
    expect(canDelegateRole('moderator', 'site_manager')).toBe(false)
    expect(roleProfiles.admin.permissions).toContain('user:manageSiteAdmins')
    expect(roleProfiles.admin.permissions).not.toContain('identity:accessConfidential')
    expect(roleProfiles.site_manager.permissions).toContain('user:manageModeratorsScoped')
    expect(roleProfiles.site_manager.permissions).not.toContain('identity:accessConfidential')
    expect(roleProfiles.dpo.permissions).toContain('identity:exportCodeEmail')
    expect(canDelegateRole('admin', 'dpo')).toBe(false)
    expect(canDelegateRole('admin', 'moderator')).toBe(false)
  })

  it('detects role inheritance and predefined role families', () => {
    expect(roleInheritsFrom('moderator', 'admin')).toBe(true)
    expect(roleInheritsFrom('site_manager', 'admin')).toBe(true)
    expect(roleInheritsFrom('admin', 'moderator')).toBe(false)
    expect(adminLikeRoles).toEqual(['admin', 'questionnaire_admin'])
    expect(statisticsRoles).toContain('analyst')
    expect(statisticsRoles).not.toContain('dpo')
    expect(auditRoles).toContain('technical_admin')
  })
})
