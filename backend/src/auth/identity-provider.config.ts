import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export type ExternalIdentityProviderKind = 'local' | 'oidc' | 'saml'

export interface ExternalIdentityProviderConfig {
  provider: ExternalIdentityProviderKind
  issuer?: string
  audience?: string
  metadataUrl?: string
  callbackPath: string
  enabled: boolean
}

@Injectable()
export class IdentityProviderConfigService {
  constructor(private readonly config: ConfigService) {}

  getConfig(): ExternalIdentityProviderConfig {
    const provider = this.normalizeProvider(this.config.get<string>('AUTH_PROVIDER', 'local'))

    return {
      provider,
      issuer: this.config.get<string>('AUTH_OIDC_ISSUER') || this.config.get<string>('AUTH_SAML_ENTITY_ID') || undefined,
      audience: this.config.get<string>('AUTH_AUDIENCE') || undefined,
      metadataUrl: this.config.get<string>('AUTH_METADATA_URL') || undefined,
      callbackPath: this.config.get<string>('AUTH_CALLBACK_PATH', '/api/auth/callback'),
      enabled: provider === 'oidc',
    }
  }

  private normalizeProvider(value: string): ExternalIdentityProviderKind {
    if (value === 'oidc' || value === 'saml') {
      return value
    }

    return 'local'
  }
}
