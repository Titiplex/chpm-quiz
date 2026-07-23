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
    'app.loading': 'Chargement…',
    'i18n.language': 'Langue de l’interface',
    'i18n.language.short': 'Langue',
    'nav.static.moderator': 'Vue modérateur',
    'nav.static.questionnaire': 'Questionnaire patient',
    'nav.home': 'Accueil',
    'nav.home.description': 'Vue produit et parcours principal.',
    'nav.projectAdministration': 'Administration projet',
    'nav.projectAdministration.description':
      'Gestion des responsables de site par les administrateurs projet / chercheurs.',
    'nav.admin': 'Questionnaires',
    'nav.admin.description':
      'Construction du questionnaire, versions, groupes, questions, popups et règles.',
    'nav.moderation': 'Modération',
    'nav.moderation.description': 'Invitations, jetons répondants et suivi par bâtiment.',
    'nav.stats': 'Statistiques',
    'nav.stats.description':
      'Analyse pseudonymisée, seuils anti-réidentification, temps et popups.',
    'nav.terminals': 'Terminaux',
    'nav.terminals.description':
      'Inventaire des terminaux ; administration globale, par site ou par bâtiment selon le rôle.',
    'nav.rgpd': 'RGPD',
    'nav.rgpd.description':
      'Registre technique, conservation, export pseudonymisé, audit et maintenance.',
    'nav.identityVault': 'Coffre email',
    'nav.identityVault.description':
      'Workflow judiciaire, double validation et audit du coffre identité.',
    'nav.login': 'Connexion',
    'nav.forbidden': 'Accès refusé',
    'home.eyebrow': 'Espace de travail',
    'home.title': 'CHM Quiz',
    'home.greeting': 'Bonjour, {name}',
    'home.welcome': 'Bienvenue sur la plateforme de questionnaires du CH Montfavet.',
    'home.modules.title': 'Vos modules',
    'home.modules.projectAdministration.title': 'Administration projet',
    'home.modules.projectAdministration.description': 'Gérer les responsables de site.',
    'home.modules.questionnaires.title': 'Questionnaires',
    'home.modules.questionnaires.description': 'Créer et publier les questionnaires.',
    'home.modules.moderation.title': 'Modération',
    'home.modules.moderation.description': 'Gérer les invitations et le suivi des réponses.',
    'home.modules.statistics.title': 'Statistiques',
    'home.modules.statistics.description': 'Consulter les indicateurs agrégés et pseudonymisés.',
    'home.actions.projectAdministration': 'Administration projet',
    'home.actions.questionnaireBuilder': 'Questionnaires',
    'home.actions.moderation': 'Modération',
    'home.actions.statistics': 'Statistiques',
    'home.actions.workspace': 'Mon espace',
    'home.hierarchy.eyebrow': 'Organisation',
    'home.hierarchy.title': 'Hiérarchie du projet',
    'home.hierarchy.description': 'Arbre dynamique limité à votre périmètre opérationnel.',
    'home.hierarchy.scope.project': 'Vue complète des administrateurs projet, des sites, des responsables et des modérateurs.',
    'home.hierarchy.scope.site': 'Vue de vos administrateurs projet, de votre site et des modérateurs placés sous votre responsabilité.',
    'home.hierarchy.scope.self': 'Vue de votre chaîne hiérarchique : administrateurs projet, responsables de votre site et votre propre affectation.',
    'home.hierarchy.kind.project': 'Projet',
    'home.hierarchy.kind.project_admin': 'Administrateur projet',
    'home.hierarchy.kind.site': 'Site',
    'home.hierarchy.kind.site_manager': 'Responsable de site',
    'home.hierarchy.kind.moderator': 'Modérateur',
    'home.hierarchy.kind.team': 'Groupe',
    'home.hierarchy.you': 'Vous',
    'home.hierarchy.inactive': 'Inactif',
    'home.hierarchy.childrenCount': '{count} éléments enfants',
    'home.hierarchy.loading': 'Chargement…',
    'home.hierarchy.refresh': 'Actualiser',
    'home.hierarchy.retry': 'Réessayer',
    'home.hierarchy.error': 'Impossible de charger la hiérarchie du projet.',
    'auth.login': 'Connexion',
    'auth.logout': 'Déconnexion',
    'auth.internal': 'Authentification interne',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.submitting': 'Connexion…',
    'auth.demo.account': 'Compte de test',
    'auth.level': 'Niveau {level}',
    'auth.role.admin.label': 'Administrateur projet / chercheur',
    'auth.role.admin.description':
      'Niveau 1 : nommé par console locale sécurisée, gère les responsables de site sans accès aux emails répondants ni au coffre identité.',
    'auth.role.siteManager.label': 'Responsable de site',
    'auth.role.siteManager.description':
      'Niveau 2 : gère son site, ses bâtiments, ses invitations, ses terminaux et ses indicateurs agrégés.',
    'auth.role.moderator.label': 'Modérateur bâtiment',
    'auth.role.moderator.description':
      'Niveau 3 : invitations et suivi opérationnel uniquement sur son bâtiment.',
    'auth.role.questionnaireAdmin.label': 'Administrateur questionnaire',
    'auth.role.questionnaireAdmin.description':
      'Rôle spécialisé : création, versionnement et publication des questionnaires, sans accès au coffre email.',
    'auth.role.analyst.label': 'Analyste',
    'auth.role.analyst.description':
      'Rôle spécialisé : statistiques pseudonymisées et seuils anti-réidentification, sans accès au coffre email.',
    'auth.role.dpo.label': 'DPO',
    'auth.role.dpo.description':
      'Rôle séparé du frontend métier : accès confidentiel uniquement par console DPO dédiée et auditée.',
    'auth.role.judicial.label': 'Responsable accès judiciaire',
    'auth.role.judicial.description':
      'Rôle spécialisé : validation juridique et exécution contrôlée du coffre email.',
    'auth.role.technical.label': 'Administrateur technique',
    'auth.role.technical.description':
      'Rôle spécialisé : maintenance, audit technique, terminaux globaux et registre technique.',
    'accessDenied.eyebrow': 'Contrôle d’accès serveur',
    'accessDenied.title': 'Cette page n’est pas visible pour votre rôle.',
    'accessDenied.body':
      'Le routeur applique la matrice de droits retournée par la session backend. Les mêmes règles sont également vérifiées par les guards NestJS : masquer le menu ne constitue pas la sécurité.',
    'accessDenied.cta': 'Aller vers l’écran autorisé',
    'moderation.title': 'Modération',
    'moderation.description':
      'Gérez les invitations, les refus et les passations de votre périmètre.',
    'moderation.actions.newInvitation': 'Nouvelle invitation',
    'moderation.actions.createInvitation': 'Créer une invitation',
    'moderation.form.deliveryMode': 'Canal d’envoi',
    'moderation.delivery.email': 'Email',
    'moderation.delivery.sms': 'SMS',
    'moderation.delivery.terminal': 'Terminal hospitalier',
    'moderation.delivery.paper': 'Version papier',
    'moderation.delivery.refusal': 'Refus de répondre',
    'moderation.status.pending': 'En attente',
    'moderation.status.sent': 'Envoyée',
    'moderation.status.opened': 'Ouverte',
    'moderation.status.inProgress': 'En cours',
    'moderation.status.draft': 'Brouillon',
    'moderation.status.submitted': 'Soumise',
    'moderation.status.expired': 'Expirée',
    'moderation.status.blocked': 'Bloquée',
    'moderation.status.cancelled': 'Annulée',
    'moderation.status.refusalRecorded': 'Refus enregistré',
    'moderation.status.paperDelivered': 'Papier remis',
    'moderation.destination.terminalUnknown': 'Terminal non renseigné',
    'moderation.destination.paper': 'Version papier remise',
    'moderation.destination.noContact': 'Aucun contact collecté',
    'moderation.terminals.title': 'Terminaux',
    'moderation.terminals.register': 'Enregistrer un terminal',
    'notifications.frequency.daily': 'quotidienne',
    'notifications.frequency.immediate': 'à chaque soumission',
    'notifications.channel.email': 'Email',
    'notifications.channel.internal': 'Notification interne',
    'notifications.subscription.summary':
      'Canal {channel} · digest {hour}h · dernière livraison {deliveredAt}.',
    'notifications.never': 'jamais',
    'notifications.actions.runDailyDigest': 'Exécuter le digest quotidien',
    'respondent.access.eyebrow': 'Accès au questionnaire',
    'respondent.access.invalidTitle': 'Lien invalide ou incomplet',
    'respondent.access.invalidBody':
      'Utilisez le lien reçu dans votre invitation pour ouvrir le questionnaire.',
    'respondent.notice.title': 'Notice d’information avant démarrage',
    'respondent.notice.consent':
      'J’ai lu la notice d’information et je comprends que la soumission finale verrouille mes réponses pseudonymisées.',
    'respondent.actions.previous': 'Précédent',
    'respondent.actions.next': 'Question suivante',
    'respondent.actions.prepareSubmit': 'Préparer la soumission finale',
    'respondent.submit.title': 'Confirmer la soumission définitive',
    'respondent.submit.body':
      'Après confirmation, la session sera verrouillée : vous pourrez consulter l’accusé de réception, mais vous ne pourrez plus modifier ni soumettre une deuxième fois.',
    'respondent.submit.confirm': 'Je confirme et je verrouille mes réponses',
    'respondent.submit.back': 'Revenir au questionnaire',
    'respondent.submit.loading': 'Soumission…',
    'respondent.freeText.help':
      'Sauvegarde automatique après saisie. Évitez les noms, emails, téléphones et détails directement identifiants.',
    'respondent.likert.group': 'Échelle Likert {points} points pour {label}',
    'respondent.required': 'obligatoire',
  },
  en: {
    'app.loading': 'Loading…',
    'i18n.language': 'Interface language',
    'i18n.language.short': 'Language',
    'nav.static.moderator': 'Moderator view',
    'nav.static.questionnaire': 'Patient questionnaire',
    'nav.home': 'Home',
    'nav.home.description': 'Product overview and main journey.',
    'nav.projectAdministration': 'Project administration',
    'nav.projectAdministration.description':
      'Site-manager management by project administrators / research leads.',
    'nav.admin': 'Questionnaires',
    'nav.admin.description':
      'Questionnaire builder, versions, groups, questions, popups, and rules.',
    'nav.moderation': 'Moderation',
    'nav.moderation.description': 'Invitations, respondent tokens, and building-level tracking.',
    'nav.stats': 'Statistics',
    'nav.stats.description':
      'Pseudonymized analysis, anti-reidentification thresholds, timing, and popups.',
    'nav.terminals': 'Terminals',
    'nav.terminals.description':
      'Terminal inventory; global, site, or building administration depending on role.',
    'nav.rgpd': 'GDPR',
    'nav.rgpd.description':
      'Technical register, retention, pseudonymized export, audit, and maintenance.',
    'nav.identityVault': 'Email vault',
    'nav.identityVault.description':
      'Judicial workflow, dual validation, and identity-vault audit.',
    'nav.login': 'Sign in',
    'nav.forbidden': 'Access denied',
    'home.eyebrow': 'Workspace',
    'home.title': 'CHM Quiz',
    'home.greeting': 'Hello, {name}',
    'home.welcome': 'Welcome to the CH Montfavet questionnaire platform.',
    'home.modules.title': 'Your modules',
    'home.modules.projectAdministration.title': 'Project administration',
    'home.modules.projectAdministration.description': 'Manage site managers.',
    'home.modules.questionnaires.title': 'Questionnaires',
    'home.modules.questionnaires.description': 'Create and publish questionnaires.',
    'home.modules.moderation.title': 'Moderation',
    'home.modules.moderation.description': 'Manage invitations and response tracking.',
    'home.modules.statistics.title': 'Statistics',
    'home.modules.statistics.description': 'View aggregated, pseudonymized indicators.',
    'home.actions.projectAdministration': 'Project administration',
    'home.actions.questionnaireBuilder': 'Questionnaires',
    'home.actions.moderation': 'Moderation',
    'home.actions.statistics': 'Statistics',
    'home.actions.workspace': 'My workspace',
    'home.hierarchy.eyebrow': 'Organization',
    'home.hierarchy.title': 'Project hierarchy',
    'home.hierarchy.description': 'Dynamic tree restricted to your operational scope.',
    'home.hierarchy.scope.project': 'Complete view of project administrators, sites, site managers, and moderators.',
    'home.hierarchy.scope.site': 'View of your project administrators, your site, and the moderators under your responsibility.',
    'home.hierarchy.scope.self': 'View of your management chain: project administrators, your site managers, and your own assignment.',
    'home.hierarchy.kind.project': 'Project',
    'home.hierarchy.kind.project_admin': 'Project administrator',
    'home.hierarchy.kind.site': 'Site',
    'home.hierarchy.kind.site_manager': 'Site manager',
    'home.hierarchy.kind.moderator': 'Moderator',
    'home.hierarchy.kind.team': 'Group',
    'home.hierarchy.you': 'You',
    'home.hierarchy.inactive': 'Inactive',
    'home.hierarchy.childrenCount': '{count} child items',
    'home.hierarchy.loading': 'Loading…',
    'home.hierarchy.refresh': 'Refresh',
    'home.hierarchy.retry': 'Try again',
    'home.hierarchy.error': 'Unable to load the project hierarchy.',
    'auth.login': 'Sign in',
    'auth.logout': 'Sign out',
    'auth.internal': 'Internal authentication',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.submitting': 'Signing in…',
    'auth.demo.account': 'Test account',
    'auth.level': 'Level {level}',
    'auth.role.admin.label': 'Project administrator / research lead',
    'auth.role.admin.description':
      'Level 1: created by the secure local console; manages site managers without respondent email or identity-vault access.',
    'auth.role.siteManager.label': 'Site manager',
    'auth.role.siteManager.description':
      'Level 2: manages their site, buildings, invitations, terminals, and aggregated indicators.',
    'auth.role.moderator.label': 'Building moderator',
    'auth.role.moderator.description':
      'Level 3: invitations and operational tracking only within their building.',
    'auth.role.questionnaireAdmin.label': 'Questionnaire administrator',
    'auth.role.questionnaireAdmin.description':
      'Specialized role: questionnaire creation, versioning, and publication, without email-vault access.',
    'auth.role.analyst.label': 'Analyst',
    'auth.role.analyst.description':
      'Specialized role: pseudonymized statistics and anti-reidentification thresholds, without email-vault access.',
    'auth.role.dpo.label': 'DPO',
    'auth.role.dpo.description':
      'Separated from the business frontend: confidential access only through the dedicated audited DPO console.',
    'auth.role.judicial.label': 'Judicial access officer',
    'auth.role.judicial.description':
      'Specialized role: legal validation and controlled execution of the email vault.',
    'auth.role.technical.label': 'Technical administrator',
    'auth.role.technical.description':
      'Specialized role: maintenance, technical audit, global terminals, and technical register.',
    'accessDenied.eyebrow': 'Server access control',
    'accessDenied.title': 'This page is not visible to your role.',
    'accessDenied.body':
      'The router applies the rights matrix returned by the backend session. The same rules are also enforced by NestJS guards: hiding the menu is not security.',
    'accessDenied.cta': 'Go to the authorized screen',
    'moderation.title': 'Moderation',
    'moderation.description':
      'Manage invitations, refusals, and questionnaire sessions in your scope.',
    'moderation.actions.newInvitation': 'New invitation',
    'moderation.actions.createInvitation': 'Create an invitation',
    'moderation.form.deliveryMode': 'Delivery channel',
    'moderation.delivery.email': 'Email',
    'moderation.delivery.sms': 'SMS',
    'moderation.delivery.terminal': 'Hospital terminal',
    'moderation.delivery.paper': 'Paper form',
    'moderation.delivery.refusal': 'Declined questionnaire',
    'moderation.status.pending': 'Pending',
    'moderation.status.sent': 'Sent',
    'moderation.status.opened': 'Opened',
    'moderation.status.inProgress': 'In progress',
    'moderation.status.draft': 'Draft',
    'moderation.status.submitted': 'Submitted',
    'moderation.status.expired': 'Expired',
    'moderation.status.blocked': 'Blocked',
    'moderation.status.cancelled': 'Cancelled',
    'moderation.status.refusalRecorded': 'Refusal recorded',
    'moderation.status.paperDelivered': 'Paper form delivered',
    'moderation.destination.terminalUnknown': 'Terminal not specified',
    'moderation.destination.paper': 'Paper form delivered',
    'moderation.destination.noContact': 'No contact information collected',
    'moderation.terminals.title': 'Terminals',
    'moderation.terminals.register': 'Register a terminal',
    'notifications.frequency.daily': 'daily',
    'notifications.frequency.immediate': 'for every submission',
    'notifications.channel.email': 'Email',
    'notifications.channel.internal': 'Internal notification',
    'notifications.subscription.summary':
      '{channel} channel · digest at {hour}:00 · last delivery {deliveredAt}.',
    'notifications.never': 'never',
    'notifications.actions.runDailyDigest': 'Run daily digest',
    'respondent.access.eyebrow': 'Questionnaire access',
    'respondent.access.invalidTitle': 'Invalid or incomplete link',
    'respondent.access.invalidBody': 'Use the link from your invitation to open the questionnaire.',
    'respondent.notice.title': 'Information notice before starting',
    'respondent.notice.consent':
      'I have read the information notice and understand that final submission locks my pseudonymized answers.',
    'respondent.actions.previous': 'Previous',
    'respondent.actions.next': 'Next question',
    'respondent.actions.prepareSubmit': 'Prepare final submission',
    'respondent.submit.title': 'Confirm final submission',
    'respondent.submit.body':
      'After confirmation, the session will be locked: you may view the receipt, but you cannot edit or submit a second time.',
    'respondent.submit.confirm': 'I confirm and lock my answers',
    'respondent.submit.back': 'Return to questionnaire',
    'respondent.submit.loading': 'Submitting…',
    'respondent.freeText.help':
      'Automatic save after typing. Avoid names, emails, phone numbers, and directly identifying details.',
    'respondent.likert.group': '{points}-point Likert scale for {label}',
    'respondent.required': 'required',
  },
} satisfies Record<string, TranslationCatalog>

export type TranslationKey = keyof typeof fallbackMessages.fr

const defaultLocaleOptions: FrontLocaleInfo[] = [
  { code: 'fr', label: 'French', nativeLabel: 'Français', direction: 'ltr' },
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
]

const fallbackCatalogs: Record<string, TranslationCatalog> = fallbackMessages
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

export function t(
  key: TranslationKey | string,
  params: Params = {},
  locale = activeLocaleState.value,
): string {
  const normalized = normalizeLocale(locale)
  const template = resolveMessage(key, normalized)

  if (!template) {
    missingKeys.add(key)
    return key
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) =>
    String(params[name] ?? ''),
  )
}

export function getMissingI18nKeys(): string[] {
  return [...missingKeys].sort()
}

export function fallbackCatalog(locale: FrontLocale): TranslationCatalog {
  const normalized = normalizeLocale(locale)
  return { ...(fallbackCatalogs[normalized] ?? fallbackCatalogs[fallbackLocale]) }
}

function resolveMessage(key: string, locale: FrontLocale): string | undefined {
  return (
    runtimeMessages[locale]?.[key] ??
    fallbackCatalogs[locale]?.[key] ??
    runtimeMessages[fallbackLocale]?.[key] ??
    fallbackCatalogs[fallbackLocale]?.[key]
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
  const configuredBase =
    typeof env.VITE_I18N_CONTENT_BASE_URL === 'string' ? env.VITE_I18N_CONTENT_BASE_URL.trim() : ''
  const base = configuredBase || `${env.BASE_URL || '/'}content/i18n`
  return base.replace(/\/$/, '')
}

function sanitizeCatalog(payload: unknown): TranslationCatalog {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return Object.entries(payload as Record<string, unknown>).reduce<TranslationCatalog>(
    (catalog, [key, value]) => {
      if (typeof value === 'string') {
        catalog[key] = value
      }
      return catalog
    },
    {},
  )
}

function sanitizeLocaleManifest(payload: unknown): FrontLocaleInfo[] {
  const rawLocales = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { locales?: unknown }).locales)
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
    return [
      {
        code,
        label: stringOrFallback(candidate.label, code.toUpperCase()),
        nativeLabel: stringOrFallback(
          candidate.nativeLabel,
          stringOrFallback(candidate.label, code.toUpperCase()),
        ),
        direction: candidate.direction === 'rtl' ? 'rtl' : 'ltr',
      },
    ]
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
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem('chpm.interface.locale')
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

  const direction =
    availableLocalesState.value.find((entry) => entry.code === locale)?.direction ?? 'ltr'
  document.documentElement.lang = locale
  document.documentElement.dir = direction
}
