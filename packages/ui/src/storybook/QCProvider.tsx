// SPDX-License-Identifier: 0BSD
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'

/** Each story has independent requests and mutation state. */
export function QCProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false }
        }
      })
  )
  useEffect(() => () => client.clear(), [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
