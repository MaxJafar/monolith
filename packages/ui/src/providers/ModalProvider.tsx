// SPDX-License-Identifier: 0BSD
import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react'

import { useModuleMetadata } from '@monolith/federation'

type ModalMetadata = { name?: string; icon: string; title: string }
export type ModalComponent<P = unknown> = FC<{ data: P; onClose: () => void }>
export type ModalInstance<P = unknown> = {
  id: string
  component: ModalComponent<P>
  data: P
  isClosing: boolean
  metadata?: ModalMetadata
  invoker?: HTMLElement
  anchor?: DOMRect
}
interface ModalState {
  stack: ModalInstance[]
  open: <P>(
    component: ModalComponent<P>,
    data: P,
    metadata?: ModalMetadata
  ) => void
  close: (id: string) => void
  remove: (id: string) => void
}
type Operation =
  | { type: 'push'; entry: ModalInstance }
  | { type: 'close' | 'remove'; id: string }
function updateStack(stack: ModalInstance[], operation: Operation) {
  if (operation.type === 'push') return stack.concat(operation.entry)
  if (operation.type === 'remove')
    return stack.filter(entry => entry.id !== operation.id)
  return stack.map(entry =>
    entry.id !== operation.id || entry.isClosing
      ? entry
      : { ...entry, isClosing: true }
  )
}
const ModalContext = createContext<ModalState | null>(null)
type Origin = { element: HTMLElement; anchor: DOMRect; expires: number }

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, dispatch] = useReducer(updateStack, [])
  const sequence = useRef(0)
  const origin = useRef<Origin | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const options = { capture: true, signal: controller.signal }
    document.addEventListener(
      'keydown',
      () => {
        origin.current = null
      },
      options
    )
    document.addEventListener(
      'pointerdown',
      event => {
        const candidate =
          event.target instanceof Element
            ? event.target.closest(
                'button, a[href], [role="button"], [role="menuitem"]'
              )
            : null
        origin.current =
          candidate instanceof HTMLElement
            ? {
                element: candidate,
                anchor: candidate.getBoundingClientRect(),
                expires: performance.now() + 2000
              }
            : null
      },
      options
    )
    return () => {
      controller.abort()
      origin.current = null
    }
  }, [])

  const open = useCallback<ModalState['open']>((component, data, metadata) => {
    const recent =
      origin.current && origin.current.expires > performance.now()
        ? origin.current
        : null
    const focus =
      typeof document === 'undefined' ? null : document.activeElement
    const invoker =
      recent?.element ??
      (focus instanceof HTMLElement && focus !== document.body
        ? focus
        : undefined)
    const entry = {
      id: 'monolith-dialog-' + ++sequence.current,
      component,
      data,
      metadata,
      isClosing: false,
      invoker,
      anchor: recent?.anchor ?? invoker?.getBoundingClientRect()
    }
    invoker?.isConnected && invoker.focus({ preventScroll: true })
    // The generic payload and its renderer are stored and retrieved as one pair.
    dispatch({ type: 'push', entry: entry as ModalInstance })
  }, [])
  const close = useCallback((id: string) => dispatch({ type: 'close', id }), [])
  const remove = useCallback(
    (id: string) => dispatch({ type: 'remove', id }),
    []
  )
  const value = useMemo(
    () => ({ stack, open, close, remove }),
    [stack, open, close, remove]
  )
  return <ModalContext value={value}>{children}</ModalContext>
}
export function useModalStore(): ModalState {
  const state = useContext(ModalContext)
  const module = useModuleMetadata()
  const open = useCallback<ModalState['open']>(
    (component, data, metadata) => {
      state?.open(component, data, metadata ?? module)
    },
    [state?.open, module]
  )
  const bound = useMemo(
    () => (state ? { ...state, open } : null),
    [state, open]
  )
  if (!bound) throw new Error('ModalProvider is missing in the component tree')
  return bound
}
