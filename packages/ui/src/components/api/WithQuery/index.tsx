// SPDX-License-Identifier: 0BSD
import type { UseQueryResult } from '@tanstack/react-query'
import { type ReactNode, useEffect } from 'react'

import { APIError } from '@monolith/api'

import { LoadingScreen } from '@/components/feedback'
import { StateMessage } from '@/components/feedback/StateMessage'
import { Button } from '@/components/inputs/Button'

export interface WithQueryProps<T> {
  query: UseQueryResult<T>
  children: (result: T) => ReactNode
  loaderSize?: string
  showLoading?: boolean
  showRetryButton?: boolean
  notFoundFallback?: ReactNode
  onNotFound?: () => void
}

export function WithQuery<T>(props: WithQueryProps<T>) {
  const { query } = props
  const missing =
    query.isError &&
    query.error instanceof APIError &&
    query.error.status === 404
  useEffect(() => {
    if (missing) props.onNotFound?.()
  }, [missing, props.onNotFound])

  switch (query.status) {
    case 'pending':
      return props.showLoading === false ? null : (
        <LoadingScreen loaderSize={props.loaderSize} />
      )
    case 'error':
      if (missing && props.notFoundFallback !== undefined)
        return props.notFoundFallback
      return (
        <StateMessage
          error
          icon="tabler:alert-triangle"
          title={query.error.message}
          action={
            props.showRetryButton === false ? undefined : (
              <Button
                variant="secondary"
                icon="tabler:refresh"
                loading={query.isFetching}
                onClick={async () => {
                  await query.refetch()
                }}
              >
                Retry
              </Button>
            )
          }
        />
      )
    case 'success':
      return query.data == null ? null : props.children(query.data)
  }
}
