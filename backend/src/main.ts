import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser')

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const frontendOrigins = config
    .get<string>('FRONTEND_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
  })

  app.use(cookieParser())
  app.setGlobalPrefix(config.get<string>('API_PREFIX', 'api'))
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: toFrenchValidationMessages(errors),
          error: 'Validation des données impossible',
        }),
    }),
  )

  await app.listen(config.get<number>('PORT', 3000))
}

function toFrenchValidationMessages(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property
    const ownMessages = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => `${propertyPath} ${translateConstraint(constraint, message)}`,
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
