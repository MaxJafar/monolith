// SPDX-License-Identifier: 0BSD
import { useEffect } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'

import { ErrorScreen, Flex, registerWorkspaceIcons } from '@monolith/ui'

import Providers from './core/providers'
import './index.css'

registerWorkspaceIcons()
const browser = window as unknown as {
  process?: { env: Record<string, string | undefined> }
}
browser.process ??= { env: {} }

function WorkspaceRoot() {
  useEffect(() => {
    document.querySelector('.preloader')?.remove()
  }, [])
  return (
    <Flex as="main" id="app" height="100dvh" width="100%" overflow="hidden">
      <ErrorBoundary
        fallback={
          <ErrorScreen
            message="The workspace could not open."
            showRetryButton
          />
        }
      >
        <Providers />
      </ErrorBoundary>
    </Flex>
  )
}

const container = document.getElementById('root')
if (!container) throw Error('The Monolith application container is missing')
const hot = import.meta.hot
const mount: Root = hot?.data.root ?? createRoot(container)
if (hot) hot.data.root = mount
mount.render(<WorkspaceRoot />)
