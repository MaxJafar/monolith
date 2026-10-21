// SPDX-License-Identifier: 0BSD
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { APIError } from '@monolith/api'

import { WithQuery } from './index'

vi.mock('@monolith/api', () => ({
  APIError: class extends Error {
    constructor(public status: number) {
      super('Request failed: ' + status)
    }
  }
}))
vi.mock('@/components/feedback', () => ({
  LoadingScreen: () => <p>Loading</p>
}))
vi.mock('@/components/feedback/StateMessage', () => ({
  StateMessage: ({ title, action }: { title: string; action?: ReactNode }) => (
    <section role="alert">
      {title}
      {action}
    </section>
  )
}))
vi.mock('@/components/inputs/Button', () => ({
  Button: () => <button>Retry</button>
}))
function query(
  status: 'pending' | 'error' | 'success',
  data?: unknown,
  error?: Error
) {
  return {
    status,
    data,
    error,
    isError: status === 'error',
    isFetching: false,
    refetch: vi.fn()
  } as unknown as UseQueryResult<unknown>
}
it('supports silent loading and custom missing-record content', () => {
  expect(
    renderToStaticMarkup(
      <WithQuery query={query('pending')} showLoading={false}>
        {String}
      </WithQuery>
    )
  ).toBe('')
  const missing = new (APIError as unknown as new (status: number) => Error)(
    404
  )
  expect(
    renderToStaticMarkup(
      <WithQuery
        query={query('error', undefined, missing)}
        notFoundFallback={<p>Removed record</p>}
      >
        {String}
      </WithQuery>
    )
  ).toBe('<p>Removed record</p>')
})
it('keeps successful zero and false values and suppresses absent data', () => {
  for (const value of [0, false]) {
    expect(
      renderToStaticMarkup(
        <WithQuery query={query('success', value)}>{String}</WithQuery>
      )
    ).toBe(String(value))
  }
  expect(
    renderToStaticMarkup(
      <WithQuery query={query('success', null)}>{String}</WithQuery>
    )
  ).toBe('')
})
it('shows non-404 errors and honors the retry visibility preference', () => {
  const failed = query('error', undefined, new Error('Temporarily unavailable'))
  const html = renderToStaticMarkup(
    <WithQuery query={failed} showRetryButton={false}>
      {String}
    </WithQuery>
  )
  expect(html).toContain('Temporarily unavailable')
  expect(html).not.toContain('button')
  expect(
    renderToStaticMarkup(<WithQuery query={failed}>{String}</WithQuery>)
  ).toContain('Retry')
})
