// SPDX-License-Identifier: 0BSD
import type { Decorator } from '@storybook/react-vite'
import i18next from 'i18next'
import { NuqsAdapter } from 'nuqs/adapters/react'
import { initReactI18next } from 'react-i18next'

import { APIEndpointProvider } from '@monolith/api'
import { I18nInitProvider, setI18n } from '@monolith/localization'

import { ModalManager } from '@/components/overlays'
import { ModalProvider, ToastProvider } from '@/providers'

import { i18nConfig } from '../../.storybook/i18n'
import { PreviewSession } from './PreviewSession'
import { QCProvider } from './QCProvider'
import { SBThemeProvider } from './SBThemeProvider'

let initialization: Promise<void> | undefined
function initialize() {
  return (initialization ??= i18next
    .use(initReactI18next)
    .init(i18nConfig)
    .then(() => {
      setI18n(i18next)
    })
    .catch(error => {
      initialization = undefined
      throw error
    }))
}
export const PreviewWrapper: Decorator = (Story, context) => (
  <I18nInitProvider
    init={initialize}
    loadingFallback={<p role="status">Loading component preview…</p>}
    errorFallback={<p role="alert">The preview could not start.</p>}
  >
    <QCProvider>
      <NuqsAdapter>
        <APIEndpointProvider
          endpoint={
            import.meta.env.VITE_API_HOST || 'http://localhost:3000/api'
          }
        >
          <PreviewSession>
            <SBThemeProvider context={context}>
              <ToastProvider>
                <ModalProvider>
                  <div className="monolith-story" id="app">
                    <Story />
                    <ModalManager />
                  </div>
                </ModalProvider>
              </ToastProvider>
            </SBThemeProvider>
          </PreviewSession>
        </APIEndpointProvider>
      </NuqsAdapter>
    </QCProvider>
  </I18nInitProvider>
)
