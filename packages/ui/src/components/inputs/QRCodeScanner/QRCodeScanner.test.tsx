// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { type ReactNode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { QRCodeScanner } from './index'

const scan = vi.hoisted(() => ({
  props: {} as {
    onScan: (codes: { rawValue: string }[]) => void
    onError: (error: Error) => void
    paused?: boolean
  }
}))
vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: (props: typeof scan.props) => {
    scan.props = props
    return <video />
  }
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
vi.mock('@/components/primitives', () => ({
  Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children, role }: { children: ReactNode; role?: string }) => (
    <p role={role}>{children}</p>
  )
}))
vi.mock('@/components/overlays', () => ({ ModalHeader: () => null }))
vi.mock('../Button', () => ({
  Button: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>Retry</button>
  )
}))
let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})
it('ignores empty camera frames and submits one scan while processing', async () => {
  let finish!: () => void
  const found = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    ),
    close = vi.fn()
  await act(async () =>
    root.render(<QRCodeScanner data={{ onScanned: found }} onClose={close} />)
  )
  await act(async () => scan.props.onScan([]))
  expect(found).not.toHaveBeenCalled()
  await act(async () => {
    scan.props.onScan([{ rawValue: 'one' }])
    scan.props.onScan([{ rawValue: 'one' }])
  })
  expect(found).toHaveBeenCalledExactlyOnceWith('one')
  expect(scan.props.paused).toBe(true)
  expect(close).not.toHaveBeenCalled()
  await act(async () => finish())
  expect(close).toHaveBeenCalledOnce()
  await act(async () => scan.props.onScan([{ rawValue: 'two' }]))
  expect(found).toHaveBeenCalledOnce()
})
it('allows retry after a failed consumer callback without logging or displaying the code', async () => {
  const found = vi
      .fn()
      .mockRejectedValueOnce(Error('sensitive scan payload'))
      .mockResolvedValue(undefined),
    close = vi.fn()
  await act(async () =>
    root.render(<QRCodeScanner data={{ onScanned: found }} onClose={close} />)
  )
  await act(async () => scan.props.onScan([{ rawValue: 'private-token' }]))
  expect(container.textContent).toContain('scanner.scan')
  expect(container.textContent).not.toContain('private-token')
  expect(close).not.toHaveBeenCalled()
  await act(async () => container.querySelector('button')!.click())
  await act(async () => scan.props.onScan([{ rawValue: 'second-token' }]))
  expect(found).toHaveBeenCalledTimes(2)
  expect(close).toHaveBeenCalledOnce()
})
it('explains denied permission and does not process a late frame after dismissal', async () => {
  const found = vi.fn()
  await act(async () =>
    root.render(
      <QRCodeScanner data={{ onScanned: found }} onClose={() => {}} />
    )
  )
  const late = scan.props.onScan
  await act(async () =>
    scan.props.onError(Object.assign(new Error(), { name: 'NotAllowedError' }))
  )
  expect(container.textContent).toContain('scanner.permission')
  await act(async () => root.render(null))
  await act(async () => late([{ rawValue: 'late' }]))
  expect(found).not.toHaveBeenCalled()
})
