import { readonly, ref } from 'vue'

export const fallbackLocale = 'fr'
export const builtInLocales = ['fr', 'en'] as const
export const supportedLocales = builtInLocales
export type FrontLocale = string

type Params = Record<string, string | number | boolean | null | undefined>
type TranslationCatalog = Record<string, string>

export interface FrontLocaleInfo {
  code: FrontLocale
  label: string
  nativeLabel: string
  direction: 'ltr' | 'rtl'
}

type ImportMetaEnvLike = Record<string, string | boolean | undefined>

const fallbackMessages = {
  fr: {
    'app.mode.static': 'Démo statique',
    'app.mode.connected': 'Produit connecté',
    'app.githubPages': 'GitHub Pages',
    'app.loading': 'Chargement…',
    'i18n.language': 'Langue de l’interface',
    'i18n.language.short': 'Langue',
    'nav.static.moderator': 'Vue modérateur',
    'nav.static.questionnaire': 'Questionnaire patient',
    'nav.home': 'Accueil',
    'nav.home.description': 'Vue produit et parcours principal.',
    'nav.projectAdministration': 'Administration projet',
    'nav.projectAdministration.description': 'Gestion des responsables de site par les administrateurs projet / chercheurs.',
    'nav.admin': 'Questionnaires',
    'nav.admin.description': 'Construction du questionnaire, versions, groupes, questions, popups et règles.',
    'nav.moderation': 'Modération',
    'nav.moderation.description': 'Invitations, jetons répondants et suivi par bâtiment.',
    'nav.respondentPreview': 'Prévisualisation répondant',
    'nav.respondentPreview.description': 'Rappel du parcours répondant par lien signé.',
    'nav.stats': 'Statistiques',
    'nav.stats.description': 'Analyse pseudonymisée, seuils anti-réidentification, temps et popups.',
    'nav.terminals': 'Terminaux',
    'nav.terminals.description': 'Inventaire des terminaux ; administration globale, par site ou par bâtiment selon le rôle.',
    'nav.rgpd': 'RGPD',
    'nav.rgpd.description': 'Registre technique, conservation, export pseudonymisé, audit et maintenance.',
    'nav.identityVault': 'Coffre email',
    'nav.identityVault.description': 'Workflow judiciaire, double validation et audit du coffre identité.',
    'nav.login': 'Connexion',
    'nav.forbidden': 'Accès refusé',
    'auth.login': 'Connexion',
    'auth.logout': 'Déconnexion',
    'auth.internal': 'Authentification interne',
    'auth.connected.title': 'Connexion réelle à l’API centrale.',
    'auth.demo.title': 'Connexion de démonstration locale.',
    'auth.connected.body': 'Les comptes internes utilisent une session serveur HTTP-only. Les répondants accèdent au questionnaire par lien signé généré dans la modération.',
    'auth.demo.body': 'Ce mode fonctionne sans backend : comptes, questionnaires, invitations et réponses sont simulés dans le navigateur pour validation métier.',
    'auth.demo.warning.title': 'Mode démonstration local',
    'auth.demo.warning.body': 'Ces comptes ne doivent jamais servir en préproduction ou production. Activez-les uniquement avec VITE_DEMO_MODE=true en développement.',
    'auth.hierarchy.eyebrow': 'Hiérarchie des rôles actifs',
    'auth.hierarchy.title': 'Global → site → bâtiment',
    'auth.specializedRoles': 'Afficher les rôles spécialisés de contrôle',
    'auth.useAccount': 'Utiliser',
    'auth.internalAccount': 'Compte interne',
    'auth.signIn': 'Se connecter',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.submitting': 'Connexion…',
    'auth.production.note': 'Le cookie de session n’est pas lisible par JavaScript. Les pages privées interrogent `/me` au chargement, puis le routeur applique les permissions retournées par le serveur.',
    'auth.demo.note': 'Mode démonstration : aucune donnée réelle n’est envoyée à un serveur. Les actions sont conservées localement dans le navigateur.',
    'auth.level': 'Niveau {level}',
    'auth.role.admin.label': 'Administrateur projet / chercheur',
    'auth.role.admin.description': 'Niveau 1 : nommé par console locale sécurisée, gère les responsables de site sans accès aux emails répondants ni au coffre identité.',
    'auth.role.siteManager.label': 'Responsable de site',
    'auth.role.siteManager.description': 'Niveau 2 : gère son site, ses bâtiments, ses invitations, ses terminaux et ses indicateurs agrégés.',
    'auth.role.moderator.label': 'Modérateur bâtiment',
    'auth.role.moderator.description': 'Niveau 3 : invitations et suivi opérationnel uniquement sur son bâtiment.',
    'auth.role.questionnaireAdmin.label': 'Administrateur questionnaire',
    'auth.role.questionnaireAdmin.description': 'Rôle spécialisé : création, versionnement et publication des questionnaires, sans accès au coffre email.',
    'auth.role.analyst.label': 'Analyste',
    'auth.role.analyst.description': 'Rôle spécialisé : statistiques pseudonymisées et seuils anti-réidentification, sans accès au coffre email.',
    'auth.role.dpo.label': 'DPO',
    'auth.role.dpo.description': 'Rôle séparé du frontend métier : accès confidentiel uniquement par console DPO dédiée et auditée.',
    'auth.role.judicial.label': 'Responsable accès judiciaire',
    'auth.role.judicial.description': 'Rôle spécialisé : validation juridique et exécution contrôlée du coffre email.',
    'auth.role.technical.label': 'Administrateur technique',
    'auth.role.technical.description': 'Rôle spécialisé : maintenance, audit technique, terminaux globaux et registre technique.',
    'accessDenied.eyebrow': 'Contrôle d’accès serveur',
    'accessDenied.title': 'Cette page n’est pas visible pour votre rôle.',
    'accessDenied.body': 'Le routeur applique la matrice de droits retournée par la session backend. Les mêmes règles sont également vérifiées par les guards NestJS : masquer le menu ne constitue pas la sécurité.',
    'accessDenied.cta': 'Aller vers l’écran autorisé',
    'respondent.notice.title': 'Notice d’information avant démarrage',
    'respondent.notice.consent': 'J’ai lu la notice d’information et je comprends que la soumission finale verrouille mes réponses pseudonymisées.',
    'respondent.actions.previous': 'Précédent',
    'respondent.actions.next': 'Question suivante',
    'respondent.actions.prepareSubmit': 'Préparer la soumission finale',
    'respondent.submit.title': 'Confirmer la soumission définitive',
    'respondent.submit.body': 'Après confirmation, la session sera verrouillée : vous pourrez consulter l’accusé de réception, mais vous ne pourrez plus modifier ni soumettre une deuxième fois.',
    'respondent.submit.confirm': 'Je confirme et je verrouille mes réponses',
    'respondent.submit.back': 'Revenir au questionnaire',
    'respondent.submit.loading': 'Soumission…',
    'respondent.freeText.help': 'Sauvegarde automatique après saisie. Évitez les noms, emails, téléphones et détails directement identifiants.',
    'respondent.likert.group': 'Échelle Likert {points} points pour {label}',
    'respondent.required': 'obligatoire',
  },
  en: {
    'app.mode.static': 'Static demo',
    'app.mode.connected': 'Connected product',
    'app.githubPages': 'GitHub Pages',
    'app.loading': 'Loading…',
    'i18n.language': 'Interface language',
    'i18n.language.short': 'Language',
    'nav.static.moderator': 'Moderator view',
    'nav.static.questionnaire': 'Patient questionnaire',
    'nav.home': 'Home',
    'nav.home.description': 'Product overview and main journey.',
    'nav.projectAdministration': 'Project administration',
    'nav.projectAdministration.description': 'Site-manager management by project administrators / research leads.',
    'nav.admin': 'Questionnaires',
    'nav.admin.description': 'Questionnaire builder, versions, groups, questions, popups, and rules.',
    'nav.moderation': 'Moderation',
    'nav.moderation.description': 'Invitations, respondent tokens, and building-level tracking.',
    'nav.respondentPreview': 'Respondent preview',
    'nav.respondentPreview.description': 'Respondent signed-link journey preview.',
    'nav.stats': 'Statistics',
    'nav.stats.description': 'Pseudonymized analysis, anti-reidentification thresholds, timing, and popups.',
    'nav.terminals': 'Terminals',
    'nav.terminals.description': 'Terminal inventory; global, site, or building administration depending on role.',
    'nav.rgpd': 'GDPR',
    'nav.rgpd.description': 'Technical register, retention, pseudonymized export, audit, and maintenance.',
    'nav.identityVault': 'Email vault',
    'nav.identityVault.description': 'Judicial workflow, dual validation, and identity-vault audit.',
    'nav.login': 'Sign in',
    'nav.forbidden': 'Access denied',
    'auth.login': 'Sign in',
    'auth.logout': 'Sign out',
    'auth.internal': 'Internal authentication',
    'auth.connected.title': 'Real connection to the central API.',
    'auth.demo.title': 'Local demonstration sign-in.',
    'auth.connected.body': 'Internal accounts use an HTTP-only server session. Respondents access questionnaires through signed links generated from moderation.',
    'auth.demo.body': 'This mode runs without a backend: accounts, questionnaires, invitations, and answers are simulated in the browser for business validation.',
    'auth.demo.warning.title': 'Local demonstration mode',
    'auth.demo.warning.body': 'These accounts must never be used in preproduction or production. Enable them only with VITE_DEMO_MODE=true during development.',
    'auth.hierarchy.eyebrow': 'Active role hierarchy',
    'auth.hierarchy.title': 'Global → site → building',
    'auth.specializedRoles': 'Show specialized control roles',
    'auth.useAccount': 'Use',
    'auth.internalAccount': 'Internal account',
    'auth.signIn': 'Sign in',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.submitting': 'Signing in…',
    'auth.production.note': 'The session cookie is not readable by JavaScript. Private pages query `/me` on load, then the router applies the permissions returned by the server.',
    'auth.demo.note': 'Demonstration mode: no real data is sent to a server. Actions are kept locally in the browser.',
    'auth.level': 'Level {level}',
    'auth.role.admin.label': 'Project administrator / research lead',
    'auth.role.admin.description': 'Level 1: created by the secure local console; manages site managers without respondent email or identity-vault access.',
    'auth.role.siteManager.label': 'Site manager',
    'auth.role.siteManager.description': 'Level 2: manages their site, buildings, invitations, terminals, and aggregated indicators.',
    'auth.role.moderator.label': 'Building moderator',
    'auth.role.moderator.description': 'Level 3: invitations and operational tracking only within their building.',
    'auth.role.questionnaireAdmin.label': 'Questionnaire administrator',
    'auth.role.questionnaireAdmin.description': 'Specialized role: questionnaire creation, versioning, and publication, without email-vault access.',
    'auth.role.analyst.label': 'Analyst',
    'auth.role.analyst.description': 'Specialized role: pseudonymized statistics and anti-reidentification thresholds, without email-vault access.',
    'auth.role.dpo.label': 'DPO',
    'auth.role.dpo.description': 'Separated from the business frontend: confidential access only through the dedicated audited DPO console.',
    'auth.role.judicial.label': 'Judicial access officer',
    'auth.role.judicial.description': 'Specialized role: legal validation and controlled execution of the email vault.',
    'auth.role.technical.label': 'Technical administrator',
    'auth.role.technical.description': 'Specialized role: maintenance, technical audit, global terminals, and technical register.',
    'accessDenied.eyebrow': 'Server access control',
    'accessDenied.title': 'This page is not visible to your role.',
    'accessDenied.body': 'The router applies the rights matrix returned by the backend session. The same rules are also enforced by NestJS guards: hiding the menu is not security.',
    'accessDenied.cta': 'Go to the authorized screen',
    'respondent.notice.title': 'Information notice before starting',
    'respondent.notice.consent': 'I have read the information notice and understand that final submission locks my pseudonymized answers.',
    'respondent.actions.previous': 'Previous',
    'respondent.actions.next': 'Next question',
    'respondent.actions.prepareSubmit': 'Prepare final submission',
    'respondent.submit.title': 'Confirm final submission',
    'respondent.submit.body': 'After confirmation, the session will be locked: you may view the receipt, but you cannot edit or submit a second time.',
    'respondent.submit.confirm': 'I confirm and lock my answers',
    'respondent.submit.back': 'Return to questionnaire',
    'respondent.submit.loading': 'Submitting…',
    'respondent.freeText.help': 'Automatic save after typing. Avoid names, emails, phone numbers, and directly identifying details.',
    'respondent.likert.group': '{points}-point Likert scale for {label}',
    'respondent.required': 'required',
  },
} satisfies Record<string, TranslationCatalog>

export type TranslationKey = keyof typeof fallbackMessages.fr

const defaultLocaleOptions: FrontLocaleInfo[] = [
  { code: 'fr', label: 'French', nativeLabel: 'Français', direction: 'ltr' },
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
]

const runtimeMessages: Record<FrontLocale, TranslationCatalog> = {}
const missingKeys = new Set<string>()
const availableLocalesState = ref<FrontLocaleInfo[]>(defaultLocaleOptions)
const activeLocaleState = ref<FrontLocale>(fallbackLocale)

export const i18nState = {
  activeLocale: readonly(activeLocaleState),
  availableLocales: readonly(availableLocalesState),
}

export function normalizeLocale(locale: string | undefined | null): FrontLocale {
  const requested = normalizeLocaleCode(locale)
  const available = availableLocalesState.value.map((entry) => entry.code)

  if (!requested) {
    return fallbackLocale
  }

  const exact = available.find((code) => code.toLowerCase() === requested)
  if (exact) {
    return exact
  }

  const [base = ''] = requested.split('-')
  const baseMatch = available.find((code) => code.toLowerCase() === base)
  return baseMatch ?? fallbackLocale
}

export function getActiveLocale(): FrontLocale {
  return activeLocaleState.value
}

export function getAvailableLocales(): FrontLocaleInfo[] {
  return [...availableLocalesState.value]
}

export function setLocale(locale: string | undefined | null): FrontLocale {
  const normalized = normalizeLocale(locale)
  activeLocaleState.value = normalized
  persistLocale(normalized)
  applyLocaleToDocument(normalized)
  return normalized
}

export async function switchLocale(locale: string | undefined | null): Promise<FrontLocale> {
  const normalized = normalizeLocale(locale)
  await loadRuntimeCatalog(normalized)
  return setLocale(normalized)
}

export async function initializeI18n(locale = getDefaultLocale()): Promise<void> {
  await loadLocaleManifest()

  const normalized = normalizeLocale(locale)
  await Promise.all([
    loadRuntimeCatalog(fallbackLocale),
    normalized === fallbackLocale ? undefined : loadRuntimeCatalog(normalized),
  ])

  setLocale(normalized)
}

export async function loadLocaleManifest(): Promise<FrontLocaleInfo[]> {
  if (typeof fetch === 'undefined') {
    availableLocalesState.value = defaultLocaleOptions
    return getAvailableLocales()
  }

  try {
    const response = await fetch(runtimeManifestUrl(), { cache: 'no-cache' })
    if (!response.ok) {
      availableLocalesState.value = defaultLocaleOptions
      return getAvailableLocales()
    }

    const manifest = sanitizeLocaleManifest(await response.json())
    availableLocalesState.value = manifest.length ? manifest : defaultLocaleOptions
  } catch {
    availableLocalesState.value = defaultLocaleOptions
  }

  return getAvailableLocales()
}

export async function loadRuntimeCatalog(locale: FrontLocale): Promise<void> {
  if (typeof fetch === 'undefined') {
    return
  }

  const normalized = normalizeLocale(locale)
  const url = runtimeCatalogUrl(normalized)

  try {
    const response = await fetch(url, { cache: 'no-cache' })
    if (!response.ok) {
      return
    }

    const payload = await response.json()
    runtimeMessages[normalized] = sanitizeCatalog(payload)
  } catch {
    // Fallback messages keep the app usable when the optional editable content pack is absent.
  }
}

export function t(key: TranslationKey | string, params: Params = {}, locale = activeLocaleState.value): string {
  const normalized = normalizeLocale(locale)
  const template = resolveMessage(key, normalized)

  if (!template) {
    missingKeys.add(key)
    return key
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => String(params[name] ?? ''))
}

export function getMissingI18nKeys(): string[] {
  return [...missingKeys].sort()
}

export function fallbackCatalog(locale: FrontLocale): TranslationCatalog {
  const normalized = normalizeLocale(locale)
  return { ...(fallbackMessages[normalized] ?? fallbackMessages[fallbackLocale]) }
}

function resolveMessage(key: string, locale: FrontLocale): string | undefined {
  return (
    runtimeMessages[locale]?.[key] ??
    fallbackMessages[locale]?.[key] ??
    runtimeMessages[fallbackLocale]?.[key] ??
    fallbackMessages[fallbackLocale]?.[key]
  )
}

function runtimeCatalogUrl(locale: FrontLocale): string {
  return `${runtimeContentBaseUrl()}/${locale}.json`
}

function runtimeManifestUrl(): string {
  return `${runtimeContentBaseUrl()}/locales.json`
}

function runtimeContentBaseUrl(): string {
  const env = import.meta.env as ImportMetaEnvLike
  const configuredBase = typeof env.VITE_I18N_CONTENT_BASE_URL === 'string'
    ? env.VITE_I18N_CONTENT_BASE_URL.trim()
    : ''
  const base = configuredBase || `${env.BASE_URL || '/'}content/i18n`
  return base.replace(/\/$/, '')
}

function sanitizeCatalog(payload: unknown): TranslationCatalog {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return Object.entries(payload as Record<string, unknown>).reduce<TranslationCatalog>((catalog, [key, value]) => {
    if (typeof value === 'string') {
      catalog[key] = value
    }
    return catalog
  }, {})
}

function sanitizeLocaleManifest(payload: unknown): FrontLocaleInfo[] {
  const rawLocales = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { locales?: unknown }).locales)
      ? (payload as { locales: unknown[] }).locales
      : []

  const seen = new Set<string>()
  return rawLocales.flatMap((entry): FrontLocaleInfo[] => {
    if (!entry || typeof entry !== 'object') {
      return []
    }

    const candidate = entry as Record<string, unknown>
    const code = normalizeLocaleCode(typeof candidate.code === 'string' ? candidate.code : '')
    if (!code || seen.has(code)) {
      return []
    }

    seen.add(code)
    return [{
      code,
      label: stringOrFallback(candidate.label, code.toUpperCase()),
      nativeLabel: stringOrFallback(candidate.nativeLabel, stringOrFallback(candidate.label, code.toUpperCase())),
      direction: candidate.direction === 'rtl' ? 'rtl' : 'ltr',
    }]
  })
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeLocaleCode(locale: string | undefined | null): string {
  const [primary = ''] = String(locale ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .split(',')

  return primary.replace(/[^a-z0-9-]/g, '')
}

function getDefaultLocale(): string {
  const stored = readStoredLocale()
  if (stored) {
    return stored
  }

  const configured = (import.meta.env as ImportMetaEnvLike).VITE_DEFAULT_LOCALE
  if (typeof configured === 'string' && configured.trim()) {
    return configured
  }

  if (typeof navigator !== 'undefined') {
    return navigator.languages?.[0] ?? navigator.language ?? fallbackLocale
  }

  return fallbackLocale
}

function readStoredLocale(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('chpm.interface.locale')
  } catch {
    return null
  }
}

function persistLocale(locale: FrontLocale): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chpm.interface.locale', locale)
    }
  } catch {
    // Storage may be unavailable in hardened browsers or tests.
  }
}

function applyLocaleToDocument(locale: FrontLocale): void {
  if (typeof document === 'undefined') {
    return
  }

  const direction = availableLocalesState.value.find((entry) => entry.code === locale)?.direction ?? 'ltr'
  document.documentElement.lang = locale
  document.documentElement.dir = direction
}
