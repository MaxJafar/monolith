import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'

type DocumentActions = {
  dirty?: boolean
  status: string
  title: string
  sourceId: string
  exportMarkdown?: () => void
}
type PageChromeState = {
  document?: DocumentActions
  setDocument: (value: DocumentActions | undefined, owner: symbol) => void
  undo?: () => void
  setUndo: (value: (() => void) | undefined) => () => void
}

const PageChromeContext = createContext<PageChromeState | null>(null)

export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [document, updateDocument] = useState<DocumentActions>()
  const documents = useRef(new Map<symbol, DocumentActions>())
  const setDocument = useCallback(
    (value: DocumentActions | undefined, owner: symbol) => {
      if (value) documents.current.set(owner, value)
      else documents.current.delete(owner)
      updateDocument(Array.from(documents.current.values()).at(-1))
    },
    []
  )
  const [undo, updateUndo] = useState<() => void>()
  const actions = useRef(new Map<symbol, () => void>())
  const setUndo = useCallback((action: (() => void) | undefined) => {
    if (!action) return () => {}
    const owner = Symbol()
    actions.current.set(owner, action)
    updateUndo(() => action)
    return () => {
      actions.current.delete(owner)
      updateUndo(() => Array.from(actions.current.values()).at(-1))
    }
  }, [])
  const value = useMemo(
    () => ({ document, setDocument, undo, setUndo }),
    [document, setDocument, undo, setUndo]
  )

  return <PageChromeContext value={value}>{children}</PageChromeContext>
}

export function usePageChrome() {
  return useContext(PageChromeContext)
}
