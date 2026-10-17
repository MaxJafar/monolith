import { createContext, useContext } from 'react'

import { getNativeRuntime } from '../desktop/runtime'

const APIEndpointContext = createContext<string | null>(null)

export function APIEndpointProvider({
  endpoint,
  children
}: {
  endpoint: string
  children: React.ReactNode
}) {
  return (
    <APIEndpointContext
      value={
        getNativeRuntime()
          ? getNativeRuntime()!.profile.origin + '/api'
          : endpoint
      }
    >
      {children}
    </APIEndpointContext>
  )
}

export function useAPIEndpoint() {
  const context = useContext(APIEndpointContext)

  if (context === null) {
    throw new Error('useAPIEndpoint must be used within an APIEndpointProvider')
  }

  return context
}
