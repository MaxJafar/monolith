import { useEffect } from 'react'
import ReactDOM, { type Root } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'

import { ErrorScreen, Flex, Text } from '@lifeforge/ui'

import Providers from './core/providers'
import './index.css'

;(
  window as unknown as { process: { env: Record<string, string | undefined> } }
).process = {
  env: {}
}

function App() {
  useEffect(() => {
    const preloader = document.querySelector('.preloader')

    if (preloader) {
      preloader.remove()
    }
  }, [])

  return (
    <ErrorBoundary
      fallback={<ErrorScreen message="An unexpected error occurred." />}
    >
      <Text
        asChild
        color={{
          base: 'bg-800',
          dark: 'bg-100'
        }}
      >
        <Flex as="main" height="100dvh" id="app" overflow="hidden" width="100%">
          <Providers />
        </Flex>
      </Text>
    </ErrorBoundary>
  )
}

const root: Root =
  import.meta.hot?.data.root ??
  ReactDOM.createRoot(document.getElementById('root')!)
if (import.meta.hot) import.meta.hot.data.root = root
root.render(<App />)
