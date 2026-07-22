import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const EMAIL_CIPHER_VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Protects direct respondent contact values at the application boundary.
 *
 * Ciphertext uses a versioned AES-256-GCM envelope with the version authenticated as
 * additional data. HMAC hashes use a separate pepper for controlled comparison. The
 * encryption key and hash pepper are distinct secrets and require coordinated rotation.
 */
@Injectable()
export class EmailCryptoService {
  constructor(private readonly config: ConfigService) {}

  /** Normalizes and encrypts an email into the versioned authenticated envelope. */
  encryptEmail(email: string): string {
    const normalizedEmail = this.normalize(email)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
    cipher.setAAD(Buffer.from(EMAIL_CIPHER_VERSION, 'utf8'))
    const ciphertext = Buffer.concat([cipher.update(normalizedEmail, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return [
      EMAIL_CIPHER_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.')
  }

  /** Decrypts and authenticates a supported contact envelope. */
  decryptEmail(payload: string): string {
    const [version, ivB64, authTagB64, ciphertextB64] = payload.split('.')

    if (version !== EMAIL_CIPHER_VERSION || !ivB64 || !authTagB64 || !ciphertextB64) {
      throw new InternalServerErrorException('Format de chiffrement email invalide')
    }

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey(), Buffer.from(ivB64, 'base64url'), {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAAD(Buffer.from(version, 'utf8'))
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64url'))

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  }

  /** Encrypts a non-email contact value while preserving case/content after trimming. */
  encryptContact(value: string): string {
    const normalized = value.trim()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
    cipher.setAAD(Buffer.from(EMAIL_CIPHER_VERSION, 'utf8'))
    const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return [
      EMAIL_CIPHER_VERSION,
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.')
  }

  decryptContact(payload: string): string {
    return this.decryptEmail(payload)
  }

  /** Returns a peppered deterministic HMAC for controlled normalized-email matching. */
  hashEmail(email: string): string {
    return createHmac('sha256', this.hashPepper()).update(this.normalize(email)).digest('hex')
  }

  hashContact(value: string): string {
    return createHmac('sha256', this.hashPepper()).update(value.trim()).digest('hex')
  }

  normalize(email: string): string {
    return email.trim().toLowerCase()
  }

  normalizePhone(phone: string): string {
    const compact = phone.trim().replace(/[\s().-]+/g, '')
    if (compact.startsWith('00')) return `+${compact.slice(2)}`
    return compact
  }

  /** Produces a display-only value that is not suitable for identity verification. */
  maskEmail(email: string): string {
    const normalizedEmail = this.normalize(email)
    const [local = '', domain] = normalizedEmail.split('@')

    if (!domain) {
      return 'email masqué'
    }

    const visibleLocal = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`
    const domainParts = domain.split('.')
    const domainName = domainParts[0] ?? ''
    const suffix = domainParts.slice(1).join('.')
    const maskedDomain = domainName.length <= 2 ? `${domainName[0] ?? '*'}*` : `${domainName.slice(0, 2)}***`

    return `${visibleLocal}@${maskedDomain}${suffix ? `.${suffix}` : ''}`
  }

  maskPhone(phone: string): string {
    const normalized = this.normalizePhone(phone)
    const visible = normalized.replace(/\D/g, '').slice(-4)
    return visible ? `•••• ${visible}` : 'téléphone masqué'
  }

  maskEncryptedEmail(payload: string): string {
    return this.maskEmail(this.decryptEmail(payload))
  }

  private encryptionKey(): Buffer {
    const rawKey = this.config.get<string>('EMAIL_ENCRYPTION_KEY_B64')

    if (rawKey) {
      const key = Buffer.from(rawKey, 'base64')
      if (key.length !== 32) {
        throw new InternalServerErrorException('EMAIL_ENCRYPTION_KEY_B64 doit contenir 32 octets encodés en base64')
      }
      return key
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new InternalServerErrorException('EMAIL_ENCRYPTION_KEY_B64 est obligatoire en production')
    }

    return createHash('sha256')
      .update(this.config.get<string>('DEV_EMAIL_ENCRYPTION_SECRET') ?? 'development-email-key-change-me')
      .digest()
  }

  private hashPepper(): string {
    const pepper = this.config.get<string>('EMAIL_HASH_PEPPER')

    if (pepper) {
      return pepper
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new InternalServerErrorException('EMAIL_HASH_PEPPER est obligatoire en production')
    }

    return this.config.get<string>('DEV_EMAIL_HASH_PEPPER') ?? 'development-email-pepper-change-me'
  }
}
