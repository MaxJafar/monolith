// SPDX-License-Identifier: 0BSD
import { type ReactNode, createContext, useContext } from 'react'

import { getNativeRuntime } from '../desktop/runtime'

const APIEndpointContext = createContext<string | undefined>(undefined)
export function APIEndpointProvider(props: {
  endpoint: string
  children: ReactNode
}) {
  const connection = getNativeRuntime()
  const endpoint = connection
    ? connection.profile.origin + '/api'
    : props.endpoint
  return (
    <APIEndpointContext value={endpoint}>{props.children}</APIEndpointContext>
  )
}
export function useAPIEndpoint(): string {
  const endpoint = useContext(APIEndpointContext)
  if (endpoint === undefined)
    throw new Error('useAPIEndpoint requires an APIEndpointProvider')
  return endpoint
}
