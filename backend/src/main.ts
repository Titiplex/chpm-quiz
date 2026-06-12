import { ValidationPipe } from '@nestjs/common'
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
    }),
  )

  await app.listen(config.get<number>('PORT', 3000))
}

void bootstrap()
