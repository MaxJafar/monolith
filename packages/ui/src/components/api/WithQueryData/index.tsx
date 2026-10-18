import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery
} from '@tanstack/react-query'
import type React from 'react'

import type { EndpointClient, InferOutput } from '@monolith/api'

import { WithQuery } from '..'

export function WithQueryData<T extends EndpointClient>({
  contract,
  queryOptions,
  children
}: {
  contract: T
  queryOptions?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'> & {
    queryKey?: unknown[]
  }
} & Omit<React.ComponentProps<typeof WithQuery<InferOutput<T>>>, 'query'>) {
  const query = useQuery(
    contract.queryOptions({
      retry: false,
      ...queryOptions
    })
  )

  return (
    <WithQuery query={query as UseQueryResult<InferOutput<T>>}>
      {children}
    </WithQuery>
  )
}
