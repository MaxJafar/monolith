import { describe, expect, it } from 'vitest'

import {
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData
} from './internalDrag'

const type = 'application/x-monolith-navigation'

function fixture() {
  const document = Object.assign(new EventTarget(), {
    defaultView: new EventTarget()
  })
  const source = { ownerDocument: document, isConnected: true }
  const values = new Map<string, string>()
  const event = {
    target: source,
    dataTransfer: {
      setData: (type: string, value: string) => values.set(type, value),
      getData: (type: string) => values.get(type) ?? '',
      get types() {
        return [...values.keys()]
      }
    }
  } as unknown as DragEvent

  return { document, source, values, event }
}

describe('native internal drag data', () => {
  it('preserves same-document gestures when WebKit strips custom MIME types', async () => {
    const { event, values, document } = fixture()
    setInternalDragData(event, type, 'page:123')
    values.clear()
    expect(hasInternalDragData(event, type)).toBe(true)
    expect(getInternalDragData(event, type)).toBe('page:123')
    document.dispatchEvent(new Event('drop'))
    expect(getInternalDragData(event, type)).toBe('page:123')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(hasInternalDragData(event, type)).toBe(false)
  })

  it('does not carry a cancelled drag into another gesture or document', () => {
    const first = fixture(),
      other = fixture()
    setInternalDragData(first.event, type, 'page:123')
    first.values.clear()
    expect(getInternalDragData(other.event, type)).toBe('')
    expect(
      getInternalDragData(first.event, 'application/x-monolith-block')
    ).toBe('')
    first.document.dispatchEvent(new Event('dragstart'))
    expect(getInternalDragData(first.event, type)).toBe('')
    setInternalDragData(first.event, type, 'page:456')
    first.values.clear()
    first.document.defaultView.dispatchEvent(new Event('blur'))
    expect(hasInternalDragData(first.event, type)).toBe(false)
  })

  it('ignores unrelated text drops and removed sources', () => {
    const { event, values, source } = fixture()
    values.set('text/plain', 'page:123')
    expect(hasInternalDragData(event, type)).toBe(false)
    setInternalDragData(event, type, 'page:123')
    values.clear()
    source.isConnected = false
    expect(getInternalDragData(event, type)).toBe('')
  })
})
