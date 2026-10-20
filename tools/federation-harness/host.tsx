import {
  getInstance,
  init,
  loadRemote,
  registerRemotes
} from '@module-federation/runtime'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { createRoot } from 'react-dom/client'
import { initReactI18next } from 'react-i18next'

import {
  AuthContext,
  type NativeHost,
  configureNativeRuntime,
  getNativeRuntime
} from '@monolith/api'
import { ModuleMetadataProvider } from '@monolith/federation'
import { getI18n, setI18n } from '@monolith/localization'
import {
  CanvasWidgetExtensionProvider,
  ModalProvider,
  useCanvasWidgets
} from '@monolith/ui'

import { registerHostShares } from '../../apps/web/src/core/providers/features/hostShares'
import moduleManager from '../../locales/lang-en/module-manager.json'
import type * as ProbeModule from './probe'

async function run() {
  const origin = 'https://monolith-fixture.invalid'
  const profile = {
    origin,
    serverId: 'fixture',
    accountId: 'fixture',
    sessionId: 'fixture'
  }
  const host = {
    platform: 'windows',
    request: async request => {
      if (
        request.path !== '/api/user/me' ||
        request.headers?.['X-Monolith-Package-Names'] !== '1'
      )
        throw Error('Addon did not use the authenticated native transport')
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          state: 'success',
          data: { userData: { id: 'fixture', name: 'Shared transport' } }
        })
      }
    }
  } as NativeHost
  configureNativeRuntime(host, profile, {} as never, 'federation-fixture')
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { 'common.module-manager': moduleManager } },
    interpolation: { escapeValue: false }
  })
  setI18n(i18n)
  await registerHostShares()
  const remotes = [
    {
      name: 'probe',
      entry: `${location.origin}/remote/remoteEntry.js`,
      type: 'module'
    }
  ]
  if (getInstance()) registerRemotes(remotes)
  else init({ name: 'host', remotes })
  const remote = await loadRemote<typeof ProbeModule>('probe/Probe')
  if (!remote) throw Error('Addon did not load')
  const hostShares = {
    AuthContext,
    getNativeRuntime,
    getI18n,
    ModalProvider,
    useCanvasWidgets,
    ModuleMetadataProvider
  }
  for (const name of Object.keys(hostShares) as (keyof typeof hostShares)[])
    if (remote.shared[name] !== hostShares[name])
      throw Error(`Duplicate shared runtime: ${name}`)
  const Probe = remote.default
  createRoot(document.getElementById('root')!).render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext
        value={
          {
            auth: true,
            userData: { id: 'fixture', name: 'Monolith fixture' }
          } as never
        }
      >
        <NuqsAdapter>
          <CanvasWidgetExtensionProvider
            value={{
              widgets: {},
              render: () => null,
              actions: [
                {
                  id: 'shared-action',
                  title: 'Shared action',
                  done: false,
                  project: 'Shared project'
                }
              ]
            }}
          >
            <Probe />
          </CanvasWidgetExtensionProvider>
        </NuqsAdapter>
      </AuthContext>
    </QueryClientProvider>
  )
}
void run().catch(error => {
  document.getElementById('root')!.textContent = `FAIL: ${error.message}`
  console.error(error)
})
