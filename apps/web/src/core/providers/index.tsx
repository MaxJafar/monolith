// SPDX-License-Identifier: 0BSD
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { type ReactNode, useEffect } from 'react'

import {
  APIEndpointProvider,
  APIOnlineStatusProvider,
  AuthProvider,
  EncryptionProvider,
  GatewayProvider,
  SocketProvider,
  setApiMutationErrorHandler
} from '@monolith/api'
import { FederationProvider } from '@monolith/federation'
import {
  I18nCommonNameSpacePreloadProvider,
  I18nInitProvider
} from '@monolith/localization'
import {
  APIOnlineStatusWrapper,
  BackgroundProvider,
  EncryptionWrapper,
  ErrorScreen,
  LoadingScreen,
  MainSidebarStateProvider,
  ModalProvider,
  PersonalizationProvider,
  ToastProvider,
  toast
} from '@monolith/ui'

import AppRoutesProvider from '@/core/routing/providers/AppRoutesProvider'
import { initI18n } from '@/core/utils/i18n'
import workspaceAPI from '@/core/utils/workspaceAPI'

import CoreFederationProvider from './features/CoreFederationProvider'
import ExternalModuleProviders from './features/ExternalModuleProviders'
import UserPersonalizationProvider from './features/UserPersonalizationProvider'

const cache = new QueryClient()
setApiMutationErrorHandler(message => toast.error(message))
function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GatewayProvider>
        <MainSidebarStateProvider>
          <UserPersonalizationProvider>
            <I18nCommonNameSpacePreloadProvider>
              <BackgroundProvider>
                <SocketProvider>
                  <FederationProvider>
                    <CoreFederationProvider>
                      <ExternalModuleProviders>
                        {children}
                      </ExternalModuleProviders>
                    </CoreFederationProvider>
                  </FederationProvider>
                </SocketProvider>
              </BackgroundProvider>
            </I18nCommonNameSpacePreloadProvider>
          </UserPersonalizationProvider>
        </MainSidebarStateProvider>
      </GatewayProvider>
    </AuthProvider>
  )
}
export default function ApplicationProviders() {
  useEffect(() => {
    const clear = () => cache.clear()
    window.addEventListener('monolith-auth-cleared', clear)
    return () => window.removeEventListener('monolith-auth-cleared', clear)
  }, [])
  return (
    <ModalProvider>
      <NuqsAdapter>
        <QueryClientProvider client={cache}>
          <ToastProvider>
            <APIEndpointProvider endpoint={import.meta.env.VITE_API_HOST}>
              <PersonalizationProvider workspaceAPI={workspaceAPI}>
                <APIOnlineStatusProvider
                  clientEnvironment={
                    import.meta.env.DEV ? 'development' : 'production'
                  }
                >
                  <APIOnlineStatusWrapper>
                    <I18nInitProvider
                      init={initI18n}
                      loadingFallback={
                        <LoadingScreen message="Loading languages…" />
                      }
                      errorFallback={
                        <ErrorScreen message="Language setup failed. Please reload to try again." />
                      }
                    >
                      <EncryptionProvider
                        apiHost={import.meta.env.VITE_API_HOST}
                      >
                        <EncryptionWrapper>
                          <SessionProviders>
                            <AppRoutesProvider />
                          </SessionProviders>
                        </EncryptionWrapper>
                      </EncryptionProvider>
                    </I18nInitProvider>
                  </APIOnlineStatusWrapper>
                </APIOnlineStatusProvider>
              </PersonalizationProvider>
            </APIEndpointProvider>
          </ToastProvider>
        </QueryClientProvider>
      </NuqsAdapter>
    </ModalProvider>
  )
}
