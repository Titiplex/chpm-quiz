import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Request, Response } from 'express'

type ExceptionPayload = {
  error?: string
  message?: string | string[]
  statusCode?: number
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : undefined

    const payload = this.toPayload(exceptionResponse)
    const messages = this.toMessages(payload.message ?? this.fallbackMessage(status))

    response.status(status).json({
      statusCode: status,
      error: {
        code: this.toErrorCode(payload.error, status),
        message: messages[0] ?? this.fallbackMessage(status),
        details: messages.length > 1 ? messages : undefined,
      },
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    })
  }

  private toPayload(value: unknown): ExceptionPayload {
    if (typeof value === 'string') {
      return { message: value }
    }

    if (value && typeof value === 'object') {
      return value as ExceptionPayload
    }

    return {}
  }

  private toMessages(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value.map((message) => String(message)).filter(Boolean)
    }

    return [String(value)].filter(Boolean)
  }

  private toErrorCode(error: string | undefined, status: number): string {
    if (error === 'Validation des données impossible' || status === HttpStatus.BAD_REQUEST) {
      return 'VALIDATION_ERROR'
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return 'UNAUTHORIZED'
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 'FORBIDDEN'
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND'
    }

    if (status >= 500) {
      return 'INTERNAL_ERROR'
    }

    return String(error ?? 'API_ERROR').toUpperCase().replace(/\W+/g, '_')
  }

  private fallbackMessage(status: number): string {
    if (status >= 500) {
      return 'Erreur serveur inattendue.'
    }

    return 'Requête API invalide.'
  }
}
