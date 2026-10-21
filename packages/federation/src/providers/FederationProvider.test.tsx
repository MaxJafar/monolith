// SPDX-License-Identifier: 0BSD
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'

import FederationProvider, { useFederation } from './FederationProvider'
import {
  ModuleMetadataProvider,
  useModuleMetadata
} from './ModuleMetadataProvider'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
it('owns functional state updates, reload callbacks and nested module metadata', async () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  let federation!: ReturnType<typeof useFederation>
  function Probe() {
    federation = useFederation()
    const metadata = useModuleMetadata()
    return (
      <output>
        {metadata.title +
          ':' +
          federation.moduleGroups.length +
          ':' +
          federation.loading}
      </output>
    )
  }
  try {
    await act(async () =>
      root.render(
        <FederationProvider>
          <ModuleMetadataProvider
            value={{
              title: 'Journal',
              name: '@monolith/journal',
              icon: 'lucide:book'
            }}
          >
            <Probe />
          </ModuleMetadataProvider>
        </FederationProvider>
      )
    )
    const setter = federation.setLoading
    await act(async () => {
      federation.setLoading(false)
      federation.setModuleGroups(previous => [
        ...previous,
        { title: 'Tools', items: [] }
      ])
      federation.refetch.current = async () => {
        federation.setError(new Error('Retry required'))
      }
    })
    expect(host.textContent).toBe('Journal:1:false')
    expect(federation.setLoading).toBe(setter)
    await act(async () => federation.refetch.current())
    expect(federation.error?.message).toBe('Retry required')
  } finally {
    await act(async () => root.unmount())
  }
})
