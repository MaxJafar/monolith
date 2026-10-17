type DragSession = {
  type: string
  value: string
  source: Node
  clear: () => void
}

const sessions = new WeakMap<Document, DragSession>()

function owner(event: DragEvent) {
  return (event.target as Node | null)?.ownerDocument
}

/** WebKit can omit custom MIME data during native dragging. Keep a same-document
 * copy for this gesture only; never infer a workspace drag from plain text. */
export function setInternalDragData(
  event: DragEvent,
  type: string,
  value: string
) {
  event.dataTransfer?.setData(type, value)
  const document = owner(event)
  const source = event.target as Node | null

  if (!document || !source) return
  sessions.get(document)?.clear()
  const abort = new AbortController()
  const clear = () => {
    abort.abort()
    sessions.delete(document)
  }
  const session = { type, value, source, clear }
  sessions.set(document, session)
  const options = { capture: true, signal: abort.signal }
  // Use a task, not a microtask: WebKit can flush microtasks between native
  // capture and bubble listeners, before React's drop handler reads the data.
  const afterDispatch = () =>
    setTimeout(() => {
      if (sessions.get(document) === session) clear()
    }, 0)
  document.addEventListener('drop', afterDispatch, options)
  document.addEventListener('dragend', afterDispatch, options)
  document.addEventListener('dragstart', clear, options)
  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') clear()
    },
    options
  )
  document.defaultView?.addEventListener('blur', clear, options)
  document.defaultView?.addEventListener('pagehide', clear, options)
}

function localValue(event: DragEvent, type: string) {
  const document = owner(event)
  const session = document && sessions.get(document)

  return session?.type === type && session.source.isConnected
    ? session.value
    : ''
}

export function getInternalDragData(event: DragEvent, type: string) {
  return event.dataTransfer?.getData(type) || localValue(event, type)
}

export function hasInternalDragData(event: DragEvent, type: string) {
  return !!(event.dataTransfer?.types.includes(type) || localValue(event, type))
}
