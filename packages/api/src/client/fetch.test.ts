// SPDX-License-Identifier: 0BSD
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type InternalAxiosRequestConfig
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APIError, fetchAPI } from './fetch'

const transport = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./axios', async () => {
  const { default: axios } = await import('axios')
  return {
    createAxiosInstance: (baseURL: string) =>
      axios.create({ baseURL, adapter: transport.send })
  }
})
const bytes = (value: unknown) =>
  new TextEncoder().encode(
    typeof value === 'string' ? value : JSON.stringify(value)
  )
function reply(
  body: unknown,
  status = 200,
  headers: Record<string, string> = { 'content-type': 'application/json' }
) {
  transport.send.mockImplementation(
    async (config: InternalAxiosRequestConfig) => ({
      config,
      data: body,
      status,
      statusText: '',
      headers: new AxiosHeaders(headers)
    })
  )
}
beforeEach(() => {
  transport.send.mockReset()
})

describe('API wire compatibility', () => {
  it('unwraps falsy data and serializes JSON request bodies with the existing route encoding', async () => {
    reply(bytes({ state: 'success', data: false }))
    expect(
      await fetchAPI('https://example.invalid/api', 'items/$save', {
        method: 'post',
        body: { title: 'New' }
      })
    ).toBe(false)
    const request = transport.send.mock.calls[0]![0]
    expect(request.url).toBe('/items/__save')
    expect(request.data).toBe('{"title":"New"}')
    expect(request.headers.get('content-type')).toContain('application/json')
    expect(request.withCredentials).toBe(true)
  })
  it('supports raw envelopes, empty responses, plaintext and external JSON', async () => {
    reply(bytes({ state: 'success', data: 0 }))
    expect(
      (await fetchAPI('https://example.invalid', '/count', { raw: true })).data
    ).toEqual({ state: 'success', data: 0 })
    reply(bytes(''), 204)
    expect(await fetchAPI('https://example.invalid', '/remove')).toBeUndefined()
    reply(bytes('saved'), 200, { 'content-type': 'text/plain; charset=utf-8' })
    expect(await fetchAPI('https://example.invalid', '/label')).toBe('saved')
    reply({ open: true })
    expect(
      await fetchAPI('https://example.invalid', '/external', {
        isExternal: true
      })
    ).toEqual({ open: true })
  })
  it('retains downloadable bytes including JSON files and subarray boundaries', async () => {
    const storage = new Uint8Array([99, 0, 255, 4, 88])
    reply(storage.subarray(1, 4), 200, {
      'x-monolith-downloadable': 'true',
      'content-type': 'application/json'
    })
    expect(await fetchAPI('https://example.invalid', '/file')).toEqual(
      new Uint8Array([0, 255, 4])
    )
  })
  it('preserves multipart files and URL-encoded fields through Axios', async () => {
    reply(bytes({ state: 'success', data: true }))
    const form = new FormData()
    form.set(
      'cover',
      new File(['fixture'], 'cover.txt', { type: 'text/plain' })
    )
    await fetchAPI('https://example.invalid', '/upload', {
      method: 'POST',
      body: form
    })
    expect(transport.send.mock.calls[0]![0].data).toBe(form)
    await fetchAPI('https://example.invalid', '/form', {
      method: 'POST',
      body: new URLSearchParams({ title: 'a & b' })
    })
    expect(transport.send.mock.calls[1]![0].data).toBe('title=a+%26+b')
  })
  it('rejects malformed envelopes and exposes server errors with their status', async () => {
    reply(bytes({ surprise: true }))
    await expect(
      fetchAPI('https://example.invalid', '/bad')
    ).rejects.toMatchObject({ name: 'APIError', status: 200 })
    reply(bytes({ state: 'error', message: 'Save rejected' }))
    await expect(fetchAPI('https://example.invalid', '/bad')).rejects.toThrow(
      'Save rejected'
    )
    transport.send.mockImplementation(
      async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError(
          'Unavailable',
          'ERR_BAD_RESPONSE',
          config,
          undefined,
          {
            config,
            status: 503,
            statusText: '',
            headers: new AxiosHeaders(),
            data: bytes({ message: 'Database unavailable' })
          }
        )
      }
    )
    await expect(
      fetchAPI('https://example.invalid', '/bad')
    ).rejects.toMatchObject({ status: 503, message: 'Database unavailable' })
    expect(
      await fetchAPI('https://example.invalid', '/bad', { raiseError: false })
    ).toBeUndefined()
  })
  it('keeps cancellation identity, native failures and meaningful timeout errors', async () => {
    const canceled = new CanceledError('Canceled by user')
    transport.send.mockRejectedValueOnce(canceled)
    await expect(fetchAPI('https://example.invalid', '/cancel')).rejects.toBe(
      canceled
    )
    const native = new Error('Native connection unavailable')
    transport.send.mockRejectedValueOnce(native)
    await expect(fetchAPI('https://example.invalid', '/native')).rejects.toBe(
      native
    )
    transport.send.mockRejectedValueOnce(
      new AxiosError('Timeout', 'ECONNABORTED')
    )
    await expect(
      fetchAPI('https://example.invalid', '/timeout')
    ).rejects.toThrow('Request timeout')
    expect(new APIError('Missing', 404)).toBeInstanceOf(Error)
  })
})
