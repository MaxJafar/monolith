// SPDX-License-Identifier: 0BSD
import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery
} from '@tanstack/react-query'
import type { ComponentProps } from 'react'

import type { EndpointClient, InferOutput } from '@monolith/api'

import { WithQuery } from '..'

export function WithQueryData<Endpoint extends EndpointClient>(
  props: {
    contract: Endpoint
    queryOptions?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'> & {
      queryKey?: unknown[]
    }
  } & Omit<ComponentProps<typeof WithQuery<InferOutput<Endpoint>>>, 'query'>
) {
  const { contract, queryOptions, ...view } = props
  const result = useQuery(
    contract.queryOptions({ retry: false, ...queryOptions })
  )
  return (
    <WithQuery
      {...view}
      query={result as UseQueryResult<InferOutput<Endpoint>>}
    >
      {props.children}
    </WithQuery>
  )
}
