import type { BuildingScope, LanguageCode, QuestionDefinition, QuestionType } from './domain'
import type { Permission, UserRole } from './rbac'

export interface ApiBuilding extends BuildingScope {
  code: string
  timezone: string
}

export interface AuthUserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  permissions: Permission[]
  building: ApiBuilding | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: AuthUserProfile
}

export interface ApiQuestion extends Omit<QuestionDefinition, 'groupId'> {
  id: string
  type: QuestionType
  displayOrder: number
}

export interface ApiQuestionGroup {
  id: string
  title: string
  description: string | null
  displayOrder: number
  randomize: boolean
  questions: ApiQuestion[]
}

export interface ApiQuestionnaire {
  id: string
  code: string
  title: string
  version: string
  language: LanguageCode
  isPublished: boolean
  groupCount: number
  questionCount: number
  groups: ApiQuestionGroup[]
}

export interface BuildingsResponse {
  buildings: ApiBuilding[]
}

export interface QuestionnairesResponse {
  questionnaires: ApiQuestionnaire[]
}
