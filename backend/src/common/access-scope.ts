import { ForbiddenException, NotFoundException } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'

export type ScopedBuilding = {
  id: string
  siteId?: string | null
  organizationId?: string | null
}

export type ScopedQuestionnaire = {
  id: string
  organizationId?: string | null
  ownerUserId?: string | null
}

export type ScopedVersion = {
  id: string
  questionnaire?: ScopedQuestionnaire | null
}

export type ScopedInvitation = {
  id: string
  organizationId?: string | null
  siteId?: string | null
  buildingId?: string | null
  questionnaireVersion?: ScopedVersion | null
}

const organizationWideRoles = new Set(['admin', 'technical_admin', 'questionnaire_admin', 'analyst'])

export function canAccessBuilding(user: AuthenticatedUser, building: ScopedBuilding): boolean {
  if (user.role === 'moderator') {
    return Boolean(user.buildingId) && user.buildingId === building.id
  }

  if (user.role === 'site_manager') {
    return Boolean(user.siteId) && user.siteId === building.siteId && sameOrganizationOrUnscoped(user, building.organizationId)
  }

  if (organizationWideRoles.has(user.role)) {
    return sameOrganizationOrUnscoped(user, building.organizationId)
  }

  return false
}

export function assertCanAccessBuilding(user: AuthenticatedUser, building: ScopedBuilding): void {
  if (!canAccessBuilding(user, building)) {
    throw new ForbiddenException('Bâtiment hors périmètre utilisateur')
  }
}

export function canAccessQuestionnaire(user: AuthenticatedUser, questionnaire: ScopedQuestionnaire): boolean {
  if (user.role === 'admin' || user.role === 'analyst') {
    return sameOrganizationOrUnscoped(user, questionnaire.organizationId)
  }

  if (user.role === 'questionnaire_admin') {
    if (questionnaire.ownerUserId && questionnaire.ownerUserId === user.id) {
      return true
    }

    return sameOrganizationOrUnscoped(user, questionnaire.organizationId)
  }

  if (user.role === 'site_manager' || user.role === 'moderator') {
    return sameOrganizationOrUnscoped(user, questionnaire.organizationId)
  }

  return false
}

export function assertCanAccessQuestionnaire(user: AuthenticatedUser, questionnaire: ScopedQuestionnaire): void {
  if (!canAccessQuestionnaire(user, questionnaire)) {
    throw new NotFoundException('Questionnaire introuvable dans votre périmètre')
  }
}

export function canAccessVersion(user: AuthenticatedUser, version: ScopedVersion): boolean {
  if (!version.questionnaire) {
    return false
  }

  return canAccessQuestionnaire(user, version.questionnaire)
}

export function assertCanAccessVersion(user: AuthenticatedUser, version: ScopedVersion): void {
  if (!canAccessVersion(user, version)) {
    throw new NotFoundException('Version de questionnaire introuvable dans votre périmètre')
  }
}

export function sameOrganizationOrUnscoped(user: AuthenticatedUser, organizationId?: string | null): boolean {
  if (!organizationId) {
    return true
  }

  if (!user.organizationId) {
    return false
  }

  return user.organizationId === organizationId
}
