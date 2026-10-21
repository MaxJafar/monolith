// SPDX-License-Identifier: 0BSD
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'

import { EncryptionWrapper } from './index'

const encryption = vi.hoisted(() => ({
  ready: false,
  error: null as string | null
}))
vi.mock('@monolith/api', () => ({ useEncryption: () => encryption }))
vi.mock('@/components/feedback', () => ({
  LoadingScreen: ({ message }: { message: string }) => <p>{message}</p>
}))
vi.mock('@/components/feedback/StateMessage', () => ({
  StateMessage: ({ title, detail }: { title: string; detail: string }) => (
    <p>
      {title}: {detail}
    </p>
  )
}))
vi.mock('@/components/inputs/Button', () => ({
  Button: () => <button>Retry</button>
}))
afterEach(() => Object.assign(encryption, { ready: false, error: null }))
const render = () =>
  renderToStaticMarkup(
    <EncryptionWrapper>
      <main>Private workspace</main>
    </EncryptionWrapper>
  )

it('withholds workspace content until the key exchange completes', () => {
  expect(render()).toContain('Initializing end-to-end encryption')
  expect(render()).not.toContain('Private workspace')
  encryption.ready = true
  expect(render()).toBe('<main>Private workspace</main>')
})
it('shows bootstrap errors even if a prior initialization was ready', () => {
  encryption.ready = true
  encryption.error = 'Public key request failed (429)'
  expect(render()).toContain('Encryption failed')
  expect(render()).toContain('429')
  expect(render()).not.toContain('Private workspace')
})
