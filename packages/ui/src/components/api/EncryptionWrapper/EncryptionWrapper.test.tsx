import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'

import { EncryptionWrapper } from './index'

const state = vi.hoisted(() => ({ ready: false, error: null as string | null }))
vi.mock('@monolith/api', () => ({ useEncryption: () => state }))
vi.mock('@/components/feedback', () => ({
  LoadingScreen: ({ message }: { message: string }) => <p>{message}</p>,
  EmptyStateScreen: ({
    message
  }: {
    message: { title: string; description: string }
  }) => (
    <p>
      {message.title}: {message.description}
    </p>
  )
}))

afterEach(() => {
  state.ready = false
  state.error = null
})

it('shows a failed bootstrap instead of leaving the app stuck on its loading screen', () => {
  state.error = 'Failed to fetch public key: 429'
  const html = renderToStaticMarkup(
    <EncryptionWrapper>Workspace</EncryptionWrapper>
  )
  expect(html).toContain('Encryption failed')
  expect(html).toContain('429')
  expect(html).not.toContain('Initializing')
  state.error = null
  expect(
    renderToStaticMarkup(<EncryptionWrapper>Workspace</EncryptionWrapper>)
  ).toContain('Initializing')
  state.ready = true
  expect(
    renderToStaticMarkup(<EncryptionWrapper>Workspace</EncryptionWrapper>)
  ).toBe('Workspace')
})
