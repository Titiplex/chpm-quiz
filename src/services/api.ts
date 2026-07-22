import { appConfig } from '@/config/env'

/** Normalized non-successful API response exposed to Pinia stores and views. */
export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type JsonBody = object | Array<unknown>

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: JsonBody
}

/**
 * Executes a JSON request through the application's single network boundary.
 *
 * Staff credentials are carried only by the HTTP-only cookie. A fresh correlation
 * identifier is added for support/audit tracing. In explicit local demo mode the
 * same typed contract is routed to the browser-local simulator.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (import.meta.env.DEV && appConfig.demoMode) {
    const { demoApiRequest } = await import('@/services/demoApi')
    return demoApiRequest<T>(path, options)
  }

  const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'X-Correlation-ID': crypto.randomUUID?.() ?? `chpm-${Date.now()}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = await readPayload(response)

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload)
  }

  return payload as T
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()

  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message: unknown }).message

    if (Array.isArray(message)) {
      return message.join(' ')
    }

    if (typeof message === 'string') {
      return message
    }
  }

  if (status === 401) {
    return 'Session expirée ou identifiants invalides.'
  }

  if (status === 403) {
    return 'Accès refusé pour ce rôle.'
  }

  return `Erreur API ${status}`
}
