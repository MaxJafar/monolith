// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useRepeatDraft } from './useRepeatDraft'

let root: Root, host: HTMLDivElement, draft: ReturnType<typeof useRepeatDraft>
const publish = vi.fn()
function Read({ value }: { value: string }) {
  draft = useRepeatDraft(value, publish, true)
  return null
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  publish.mockClear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})
it('does not publish or normalize a saved value on mount or external reset', async () => {
  await act(async () =>
    root.render(
      <Read value={'DTSTART:20261020T120000Z\nRRULE:FREQ=WEEKLY;BYDAY=TU'} />
    )
  )
  expect(publish).not.toHaveBeenCalled()
  expect(draft.draft.frequency).toBe('weekly')
  await act(async () =>
    root.render(
      <Read value={'DTSTART:20261021T180000Z\nRRULE:FREQ=DAILY;COUNT=3'} />
    )
  )
  expect(publish).not.toHaveBeenCalled()
  expect(draft.draft.start?.getUTCHours()).toBe(18)
  expect(draft.draft.count).toBe(3)
})
it('retains incomplete local fields until there is a valid serialized rule', async () => {
  await act(async () => root.render(<Read value="" />))
  await act(async () => draft.change({ frequency: 'weekly', days: ['fri'] }))
  expect(publish).toHaveBeenLastCalledWith('')
  expect(draft.draft.days).toEqual(['fri'])
  await act(async () =>
    draft.change({ start: new Date('2026-10-20T12:00:00Z') })
  )
  const output = publish.mock.calls.at(-1)![0]
  expect(output).toContain('BYDAY=FR')
  expect(output).toContain('duration_amt=1;duration_unit=hour')
  await act(async () => root.render(<Read value={output} />))
  expect(draft.draft.days).toEqual(['fri'])
})
it('keeps an advanced schedule unchanged until the caller edits it', async () => {
  await act(async () =>
    root.render(<Read value="RRULE:FREQ=DAILY;BYHOUR=9,17" />)
  )
  expect(draft.structured).toBe(false)
  expect(publish).not.toHaveBeenCalled()
})
