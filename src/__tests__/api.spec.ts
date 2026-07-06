import { describe, expect, it, vi } from 'vitest'

import { apiRequest } from '@/services/api'

describe('apiRequest', () => {
  it('serializes JSON bodies and attaches correlation headers', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiRequest<{ ok: boolean }>('/health', {
      method: 'POST',
      body: { ping: true },
    })

    expect(response).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://localhost:3000/api/health')
    expect(init.credentials).toBe('include')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ ping: true }))
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect((init.headers as Record<string, string>)['X-Correlation-ID']).toBeTruthy()
  })

  it('raises ApiError with API message payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: ['champ requis', 'valeur invalide'] }), { status: 400 })),
    )

    await expect(apiRequest('/questionnaires')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'champ requis valeur invalide',
    })
  })

  it('returns undefined for empty 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('keeps explicit caller headers while preserving generated API defaults', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })))

    await apiRequest('/custom', {
      headers: { 'X-Correlation-ID': 'manual-correlation-id', 'X-Client': 'test' },
    })

    const [, init] = (fetch as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[0]
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'X-Correlation-ID': 'manual-correlation-id',
      'X-Client': 'test',
    })
  })

  it('returns text payloads when the backend response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('plain response', { status: 200 })))

    await expect(apiRequest<string>('/plain')).resolves.toBe('plain response')
  })

  it('uses safe fallback messages for common authorization errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })))

    await expect(apiRequest('/admin')).rejects.toMatchObject({
      status: 403,
      message: 'Accès refusé pour ce rôle.',
    })
  })

  it('uses a generic status fallback for unstructured server errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 502 })))

    await expect(apiRequest('/broken')).rejects.toMatchObject({
      status: 502,
      message: 'Erreur API 502',
    })
  })

})
