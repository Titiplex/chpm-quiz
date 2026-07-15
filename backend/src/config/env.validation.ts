const productionModes = new Set(['production', 'preproduction', 'staging'])
const booleanKeys = new Set([
  'COOKIE_SECURE',
  'EMAIL_IDENTITY_DISABLED_FOR_APP',
  'ENABLE_NOTIFICATION_DIGEST_WORKER',
  'EXPOSE_RESPONDENT_DEV_LINKS',
])
export function validateEnvironment(input: Record<string, unknown>) {
  const env: Record<string, string | number | boolean> = {}
  const nodeEnv = stringValue(input.NODE_ENV, 'development')
  const isProductionLike = productionModes.has(nodeEnv)

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue
    env[key] = String(value)
  }

  env.NODE_ENV = nodeEnv
  env.API_PREFIX = safePathPrefix(stringValue(input.API_PREFIX, 'api'), 'API_PREFIX')
  env.PORT = integerValue(input.PORT, 3000, 'PORT', 1, 65_535)
  env.SESSION_TTL_HOURS = integerValue(input.SESSION_TTL_HOURS, 12, 'SESSION_TTL_HOURS', 1, 24 * 14)
  env.RESPONDENT_TOKEN_TTL_DAYS = integerValue(input.RESPONDENT_TOKEN_TTL_DAYS, 30, 'RESPONDENT_TOKEN_TTL_DAYS', 1, 365)
  env.STATISTICS_MIN_GROUP_SIZE = integerValue(input.STATISTICS_MIN_GROUP_SIZE, 5, 'STATISTICS_MIN_GROUP_SIZE', 5, 100)
  env.RATE_LIMIT_WINDOW_SECONDS = integerValue(input.RATE_LIMIT_WINDOW_SECONDS, 60, 'RATE_LIMIT_WINDOW_SECONDS', 1, 3600)
  env.RATE_LIMIT_MAX_REQUESTS = integerValue(input.RATE_LIMIT_MAX_REQUESTS, 240, 'RATE_LIMIT_MAX_REQUESTS', 10, 100_000)
  env.DRAFT_RETENTION_DAYS = integerValue(input.DRAFT_RETENTION_DAYS, 45, 'DRAFT_RETENTION_DAYS', 1, 3650)
  env.IDENTITY_RETENTION_DAYS = integerValue(input.IDENTITY_RETENTION_DAYS, 365, 'IDENTITY_RETENTION_DAYS', 1, 3650)
  env.AUDIT_RETENTION_DAYS = integerValue(input.AUDIT_RETENTION_DAYS, 730, 'AUDIT_RETENTION_DAYS', 30, 3650)
  env.EMAIL_JOB_MAX_ATTEMPTS = integerValue(input.EMAIL_JOB_MAX_ATTEMPTS, 3, 'EMAIL_JOB_MAX_ATTEMPTS', 1, 20)
  env.EMAIL_JOB_RETRY_DELAY_MS = integerValue(input.EMAIL_JOB_RETRY_DELAY_MS, 1000, 'EMAIL_JOB_RETRY_DELAY_MS', 100, 3_600_000)
  env.SMS_JOB_MAX_ATTEMPTS = integerValue(input.SMS_JOB_MAX_ATTEMPTS, 3, 'SMS_JOB_MAX_ATTEMPTS', 1, 20)
  env.SMS_JOB_RETRY_DELAY_MS = integerValue(input.SMS_JOB_RETRY_DELAY_MS, 1000, 'SMS_JOB_RETRY_DELAY_MS', 100, 3_600_000)
  env.NOTIFICATION_DIGEST_WORKER_INTERVAL_MS = integerValue(input.NOTIFICATION_DIGEST_WORKER_INTERVAL_MS, 3_600_000, 'NOTIFICATION_DIGEST_WORKER_INTERVAL_MS', 60_000, 86_400_000)

  for (const key of booleanKeys) {
    env[key] = booleanValue(input[key], key === 'COOKIE_SECURE' ? isProductionLike : undefined, key)
  }

  const frontendOrigins = parseOrigins(stringValue(input.FRONTEND_ORIGIN, isProductionLike ? '' : 'http://localhost:5173'))
  if (!frontendOrigins.length) {
    throw new Error('FRONTEND_ORIGIN doit contenir au moins une origine autorisée')
  }

  if (isProductionLike) {
    for (const origin of frontendOrigins) {
      if (origin === '*' || origin.includes('localhost') || origin.includes('127.0.0.1') || !origin.startsWith('https://')) {
        throw new Error('FRONTEND_ORIGIN doit être strict, HTTPS, sans wildcard ni localhost en production/préproduction')
      }
    }
  }
  env.FRONTEND_ORIGIN = frontendOrigins.join(',')

  env.COOKIE_SAMESITE = oneOf(stringValue(input.COOKIE_SAMESITE, isProductionLike ? 'strict' : 'lax').toLowerCase(), ['strict', 'lax', 'none'], 'COOKIE_SAMESITE')
  env.SESSION_COOKIE_NAME = cookieName(stringValue(input.SESSION_COOKIE_NAME, 'chpm_session'))

  if (env.COOKIE_SAMESITE === 'none' && env.COOKIE_SECURE !== true) {
    throw new Error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true')
  }

  const defaultOperationalDatabaseUrl = isProductionLike ? '' : 'postgresql://chpm:chpm@localhost:5432/chpm_quiz?schema=public'
  const defaultIdentityDatabaseUrl = isProductionLike ? '' : 'postgresql://chpm:chpm@localhost:5432/chpm_quiz?schema=identity'
  const operationalDatabaseUrl = stringValue(input.OPERATIONAL_DATABASE_URL, stringValue(input.DATABASE_URL, defaultOperationalDatabaseUrl))
  const identityDatabaseUrl = stringValue(input.IDENTITY_DATABASE_URL, stringValue(input.DATABASE_URL, defaultIdentityDatabaseUrl))
  if (!operationalDatabaseUrl) throw new Error('OPERATIONAL_DATABASE_URL ou DATABASE_URL est obligatoire')
  if (!identityDatabaseUrl) throw new Error('IDENTITY_DATABASE_URL ou DATABASE_URL est obligatoire')
  env.OPERATIONAL_DATABASE_URL = operationalDatabaseUrl
  env.IDENTITY_DATABASE_URL = identityDatabaseUrl
  env.DATABASE_URL = stringValue(input.DATABASE_URL, operationalDatabaseUrl)

  env.RESPONDENT_TOKEN_SECRET = secretValue(
    input.RESPONDENT_TOKEN_SECRET ?? (isProductionLike ? undefined : 'development-only-change-me'),
    'RESPONDENT_TOKEN_SECRET',
    isProductionLike,
  )
  env.EMAIL_PROVIDER = oneOf(stringValue(input.EMAIL_PROVIDER, 'simulation'), ['simulation', 'brevo', 'sendgrid', 'mailjet'], 'EMAIL_PROVIDER')
  env.SMS_PROVIDER = oneOf(stringValue(input.SMS_PROVIDER, isProductionLike ? 'disabled' : 'simulation'), ['disabled', 'simulation', 'twilio', 'brevo'], 'SMS_PROVIDER')
  env.SMS_SENDER = stringValue(input.SMS_SENDER, 'CHPM')
  env.AUTH_PROVIDER = oneOf(stringValue(input.AUTH_PROVIDER, 'local'), ['local', 'oidc', 'saml'], 'AUTH_PROVIDER')
  env.EMAIL_FROM = stringValue(input.EMAIL_FROM, 'no-reply@chpm.local')
  env.EMAIL_FROM_NAME = stringValue(input.EMAIL_FROM_NAME, 'CHPM Questionnaires')
  env.DPO_CONTACT = stringValue(input.DPO_CONTACT, 'dpo@chpm.local')

  if (isProductionLike) {
    assertTrue(env.COOKIE_SECURE === true, 'COOKIE_SECURE=true est obligatoire en production/préproduction')
    assertNoDevSecret(String(env.RESPONDENT_TOKEN_SECRET), 'RESPONDENT_TOKEN_SECRET')
    assertDatabaseUrl(operationalDatabaseUrl, 'OPERATIONAL_DATABASE_URL')
    assertDatabaseUrl(identityDatabaseUrl, 'IDENTITY_DATABASE_URL')
    assertDistinctDatabases(operationalDatabaseUrl, identityDatabaseUrl)
    assertBase64Key(input.EMAIL_ENCRYPTION_KEY_B64, 'EMAIL_ENCRYPTION_KEY_B64')
    assertBase64Key(input.JUDICIAL_EXPORT_KEY_B64, 'JUDICIAL_EXPORT_KEY_B64')
    secretValue(input.EMAIL_HASH_PEPPER, 'EMAIL_HASH_PEPPER', true)

    if (env.EMAIL_PROVIDER === 'simulation') {
      throw new Error('EMAIL_PROVIDER=simulation est interdit en production/préproduction')
    }

    if (env.SMS_PROVIDER === 'simulation') {
      throw new Error('SMS_PROVIDER=simulation est interdit en production/préproduction ; utiliser disabled, twilio ou brevo')
    }
  }

  return env
}

function stringValue(value: unknown, fallback = ''): string {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).trim()
}

function integerValue(value: unknown, fallback: number, key: string, min: number, max: number): number {
  const parsed = Number(value === undefined || value === null || value === '' ? fallback : value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} doit être un entier entre ${min} et ${max}`)
  }
  return parsed
}

function booleanValue(value: unknown, fallback: boolean | undefined, key: string): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback ?? false
  }

  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  throw new Error(`${key} doit être un booléen`)
}

function parseOrigins(raw: string): string[] {
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean)
}

function oneOf<T extends string>(value: string, allowed: readonly T[], key: string): T {
  if ((allowed as readonly string[]).includes(value)) {
    return value as T
  }
  throw new Error(`${key} doit valoir ${allowed.join(', ')}`)
}

function cookieName(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('SESSION_COOKIE_NAME contient des caractères non autorisés')
  }
  return value
}

function safePathPrefix(value: string, key: string): string {
  const normalized = value.replace(/^\/+|\/+$/g, '')
  if (!/^[A-Za-z0-9/_-]+$/.test(normalized)) {
    throw new Error(`${key} doit être un préfixe URL simple`)
  }
  return normalized
}

function secretValue(value: unknown, key: string, strict: boolean): string {
  const secret = stringValue(value)
  if (!secret) {
    throw new Error(`${key} est obligatoire`)
  }
  if (strict && secret.length < 32) {
    throw new Error(`${key} doit contenir au moins 32 caractères`)
  }
  return secret
}

function assertBase64Key(value: unknown, key: string): void {
  const raw = stringValue(value)
  if (!raw) throw new Error(`${key} est obligatoire`)
  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length !== 32) {
    throw new Error(`${key} doit contenir exactement 32 octets encodés en base64`)
  }
}

function assertNoDevSecret(value: string, key: string): void {
  if (/dev|development|change-me|local/i.test(value)) {
    throw new Error(`${key} contient une valeur de développement interdite`)
  }
}

function assertDatabaseUrl(value: string, key: string): void {
  if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
    throw new Error(`${key} doit être une URL PostgreSQL`)
  }
  if (/chpm:chpm@|localhost|127\.0\.0\.1/i.test(value)) {
    throw new Error(`${key} contient des paramètres de développement interdits en production/préproduction`)
  }
}

function assertDistinctDatabases(operationalUrl: string, identityUrl: string): void {
  if (operationalUrl === identityUrl) {
    throw new Error('OPERATIONAL_DATABASE_URL et IDENTITY_DATABASE_URL doivent utiliser des comptes/URLs distincts')
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}
