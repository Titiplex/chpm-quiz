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

export function canAccessBuilding(user: AuthenticatedUser, building: ScopedBuilding): boolean {
  if (user.role === 'admin' || user.role === 'dpo' || user.role === 'technical_admin' || user.role === 'judicial_officer') {
    return sameOrganizationOrUnscoped(user, building.organizationId)
  }

  if (user.role === 'moderator') {
    return Boolean(user.buildingId) && user.buildingId === building.id
  }

  if (user.role === 'site_manager') {
    return Boolean(user.siteId) && user.siteId === building.siteId
  }

  if (user.role === 'questionnaire_admin' || user.role === 'analyst') {
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
  if (user.role === 'admin' || user.role === 'dpo' || user.role === 'technical_admin' || user.role === 'judicial_officer' || user.role === 'analyst') {
    return sameOrganizationOrUnscoped(user, questionnaire.organizationId)
  }

  if (user.role === 'questionnaire_admin') {
    if (questionnaire.ownerUserId && questionnaire.ownerUserId === user.id) {
      return true
    }

    return sameOrganizationOrUnscoped(user, questionnaire.organizationId)
  }

  return false
}

export function assertCanAccessQuestionnaire(user: AuthenticatedUser, questionnaire: ScopedQuestionnaire): void {
  if (!canAccessQuestionnaire(user, questionnaire)) {
    throw new NotFoundException('Questionnaire introuvable dans votre périmètre')
  }
}

export function sameOrganizationOrUnscoped(user: AuthenticatedUser, organizationId?: string | null): boolean {
  if (!organizationId || !user.organizationId) {
    return true
  }

  return user.organizationId === organizationId
}
