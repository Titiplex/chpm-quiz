import { randomUUID } from 'node:crypto'

import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NextFunction, Request, Response } from 'express'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser')

import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/filters/api-exception.filter'
import { ObservabilityService } from './observability/observability.service'

type CorrelatedRequest = Request & {
  correlationId?: string
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
  const config = app.get(ConfigService)
  const observability = app.get(ObservabilityService)

  const frontendOrigins = resolveFrontendOrigins(config)

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'X-Correlation-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
    maxAge: 600,
  })

  const rateLimitWindowMs = Math.max(1, Number(config.get<string>('RATE_LIMIT_WINDOW_SECONDS', '60'))) * 1000
  const rateLimitMax = Math.max(10, Number(config.get<string>('RATE_LIMIT_MAX_REQUESTS', '240')))
  const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

  app.use((request: Request, response: Response, next: NextFunction) => {
    const now = Date.now()
    const key = `${request.ip}:${request.method}:${request.path}`
    const bucket = rateLimitBuckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs })
      next()
      return
    }

    bucket.count += 1
    if (bucket.count > rateLimitMax) {
      response.status(429).json({
        message: 'Trop de requêtes. Réessayez dans quelques instants.',
        error: 'Rate limit',
      })
      return
    }

    next()
  })

  app.use((request: CorrelatedRequest, response: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint()
    const correlationId = resolveCorrelationId(request)
    request.correlationId = correlationId

    response.setHeader('X-Request-Id', correlationId)
    response.setHeader('X-Correlation-ID', correlationId)
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site')

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      observability.recordHttp({
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs,
      })
      logJson(config, {
        level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
        event: 'http_request',
        correlationId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs),
      })
    })

    next()
  })

  app.use(cookieParser())
  app.setGlobalPrefix(config.get<string>('API_PREFIX', 'api'))
  app.useGlobalFilters(new ApiExceptionFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          message: toFrenchValidationMessages(errors),
          error: 'Validation des données impossible',
        }),
    }),
  )

  await app.listen(config.get<number>('PORT', 3000))
}

function resolveFrontendOrigins(config: ConfigService): string[] {
  const origins = config
    .get<string>('FRONTEND_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (!origins.length) {
    throw new Error('FRONTEND_ORIGIN doit contenir au moins une origine')
  }

  const nodeEnv = config.get<string>('NODE_ENV', 'development')
  const productionLike = ['production', 'preproduction', 'staging'].includes(nodeEnv)

  if (productionLike && origins.some((origin) => origin === '*' || !origin.startsWith('https://'))) {
    throw new Error('CORS production refusé : FRONTEND_ORIGIN doit être une liste HTTPS sans wildcard')
  }

  return origins
}

function resolveCorrelationId(request: Request): string {
  const candidate = request.header('x-correlation-id') || request.header('x-request-id')

  if (candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate)) {
    return candidate
  }

  return randomUUID()
}

function logJson(config: ConfigService, payload: Record<string, unknown>): void {
  if (config.get<string>('NODE_ENV') === 'test') return
  const record = {
    service: 'chpm-api',
    timestamp: new Date().toISOString(),
    ...payload,
  }
  console.log(JSON.stringify(record))
}

function toFrenchValidationMessages(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property
    const ownMessages = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => `${propertyPath} ${translateConstraint(constraint, String(message))}`,
    )
    const childMessages = toFrenchValidationMessages(error.children ?? [], propertyPath)
    return [...ownMessages, ...childMessages]
  })
}

function translateConstraint(constraint: string, fallback: string): string {
  const translations: Record<string, string> = {
    arrayMaxSize: 'contient trop de valeurs.',
    isArray: 'doit être une liste.',
    isBoolean: 'doit être vrai ou faux.',
    isEnum: 'contient une valeur non autorisée.',
    isIn: 'contient une valeur non disponible dans cette interface.',
    isInt: 'doit être un nombre entier.',
    isOptional: 'est optionnel mais invalide.',
    isString: 'doit être un texte.',
    max: 'est supérieur au maximum autorisé.',
    maxLength: 'est trop long.',
    min: 'est inférieur au minimum autorisé.',
    minLength: 'est trop court.',
    nestedValidation: 'contient une configuration invalide.',
    whitelistValidation: 'n’est pas un champ accepté par l’API.',
  }

  return translations[constraint] ?? fallback
}

void bootstrap()
