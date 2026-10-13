import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'

import { useModuleMetadata } from '@lifeforge/federation'

type ModalMetadata = { name?: string; icon: string; title: string }

export type ModalComponent<P = unknown> = FC<{
  data: P
  onClose: () => void
}>

export type ModalInstance<P = unknown> = {
  id: string
  component: ModalComponent<P>
  data: P
  isClosing: boolean
  metadata?: ModalMetadata
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

const ModalContext = createContext<ModalState | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalInstance[]>([])
  const idCounter = useRef(0)

  const open: ModalState['open'] = useCallback((component, data, metadata) => {
    const id = String(idCounter.current++)
    // The generic component/payload pair remains intact across this storage boundary.
    const instance = {id,component,data,metadata,isClosing:false} as unknown as ModalInstance
    setStack(prev => [...prev,instance])
  }, [])

  const close: ModalState['close'] = useCallback((id: string) => {
    setStack(prev => {
      const index = prev.findIndex(entry => entry.id === id)

      if (index === -1) return prev

      const next = [...prev]
      next[index] = { ...next[index], isClosing: true }

      return next
    })
  }, [])

  const remove: ModalState['remove'] = useCallback((id: string) => {
    setStack(prev => {
      const index = prev.findIndex(entry => entry.id === id)

      if (index === -1) return prev

      const next = [...prev]
      next.splice(index, 1)

      return next
    })
  }, [])

  const value = useMemo<ModalState>(
    () => ({ stack, open, close, remove }),
    [stack, open, close, remove]
  )

  return <ModalContext value={value}>{children}</ModalContext>
}

export function useModalStore(): ModalState {
  const ctx = useContext(ModalContext)
  const metadata = useModuleMetadata()
  
const open = useCallback<ModalState['open']>(
    (component, data) => ctx?.open(component, data, metadata),
    [ctx?.open, metadata]
  )
  
const value = useMemo(() => (ctx ? { ...ctx, open } : null), [ctx, open])

  if (!ctx) {
    throw new Error('ModalProvider is missing in the component tree')
  }

  return value!
}
