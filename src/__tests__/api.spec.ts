import { describe, expect, it, vi } from 'vitest'

import { apiRequest, ApiError } from '@/services/api'

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
})
