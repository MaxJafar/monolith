// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { type ReactNode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ChoiceRoot, type ChoiceRootProps } from './ChoiceRoot'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function Example(props: Partial<Omit<ChoiceRootProps<string>, 'children'>>) {
  return (
    <ChoiceRoot choices={['gallery', 'list']} {...props}>
      {state => (
        <>
          <output>{state.value}</output>
          <button onClick={() => state.change('list')}>List</button>
          <button onClick={() => state.change('removed')}>Unavailable</button>
        </>
      )}
    </ChoiceRoot>
  )
}
const render = async (node: ReactNode) => {
  await act(async () => root.render(node))
}
const select = async (index = 0) => {
  await act(async () => {
    container.querySelectorAll('button')[index].click()
  })
}
it('supports local views without mounting a URL adapter', async () => {
  await render(<Example />)
  expect(container.querySelector('output')?.textContent).toBe('gallery')
  await select()
  expect(container.querySelector('output')?.textContent).toBe('list')
})
it('keeps a controlled view in the parent until the parent accepts a change', async () => {
  const change = vi.fn()
  await render(<Example value="gallery" onChange={change} />)
  await select()
  expect(change).toHaveBeenCalledWith('list')
  expect(container.querySelector('output')?.textContent).toBe('gallery')
  await render(<Example value="list" onChange={change} />)
  expect(container.querySelector('output')?.textContent).toBe('list')
})
it('restores a valid saved layout and ignores removed options', async () => {
  localStorage.setItem('projects-view', 'removed')
  await render(<Example storageKey="projects-view" />)
  expect(container.querySelector('output')?.textContent).toBe('gallery')
  await select(1)
  expect(container.querySelector('output')?.textContent).toBe('gallery')
  await select()
  expect(localStorage.getItem('projects-view')).toBe('list')
  await render(null)
  await render(<Example storageKey="projects-view" />)
  expect(container.querySelector('output')?.textContent).toBe('list')
})
it('uses URL selection ahead of saved preferences and writes valid changes back', async () => {
  localStorage.setItem('projects-view', 'list')
  const update = vi.fn()
  await render(
    <NuqsTestingAdapter
      searchParams="?view=gallery"
      hasMemory
      onUrlUpdate={update}
    >
      <Example queryKey="view" storageKey="projects-view" />
    </NuqsTestingAdapter>
  )
  expect(container.querySelector('output')?.textContent).toBe('gallery')
  await select()
  await vi.waitFor(() => expect(update).toHaveBeenCalled())
  expect(container.querySelector('output')?.textContent).toBe('list')
  expect(localStorage.getItem('projects-view')).toBe('list')
})
it('keeps views usable when browser storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('Storage denied')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Error('Storage denied')
  })
  await render(<Example storageKey="projects-view" />)
  await select()
  expect(container.querySelector('output')?.textContent).toBe('list')
})
