import { describe, expect, it, vi } from 'vitest'

import type { ModuleConfig, ModuleWidget } from '@monolith/configs'
import type { FederatedModule } from '@monolith/federation'

import { createWidgetCatalog, resolveWidget } from './widgetCatalog'

const module = {
  id: 'test-addon',
  name: '@monolith/test',
  remoteId: 'test',
  remoteEntryUrl: '/addons/test/1/remoteEntry.js'
} as FederatedModule
const descriptor = {
  id: 'clock',
  moduleName: module.name,
  componentName: 'Clock',
  icon: 'tabler:clock'
} as ModuleWidget
const Clock = () => null

describe('installed widget inventory', () => {
  it('preserves component state across refreshes and retires disabled addons', () => {
    const load = vi.fn()
    const catalog = createWidgetCatalog(load)
    const first = catalog([descriptor], [module]).clock!
    expect(
      catalog([{ ...descriptor, minW: 2 }], [{ ...module }]).clock!.component
    ).toBe(first.component)
    expect(catalog([descriptor], [])).toEqual({})
    expect(catalog([descriptor], [module]).clock!.component).not.toBe(
      first.component
    )
    expect(load).not.toHaveBeenCalled()
  })

  it('replaces the component when the installed release changes', () => {
    const catalog = createWidgetCatalog(vi.fn())
    const first = catalog([descriptor], [module]).clock!.component
    expect(
      catalog(
        [descriptor],
        [{ ...module, remoteEntryUrl: '/addons/test/2/remoteEntry.js' }]
      ).clock!.component
    ).not.toBe(first)
  })

  it('can load a widget when another widget in the same addon fails', async () => {
    const config: ModuleConfig = {
      routes: {},
      widgets: [
        async () => {
          throw new Error('unrelated widget')
        },
        async () => ({
          config: { id: 'clock', icon: 'tabler:clock' },
          default: Clock
        })
      ]
    }
    expect(await resolveWidget(config, 'clock')).toEqual({ default: Clock })
    await expect(resolveWidget(config, 'missing')).rejects.toThrow('missing')
  })
})
