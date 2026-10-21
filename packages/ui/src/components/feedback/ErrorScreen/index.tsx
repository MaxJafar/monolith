// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { Button } from '@/components/inputs'

import { StateMessage } from '../StateMessage'

export function ErrorScreen({
  message,
  showRetryButton
}: {
  message: ReactNode
  showRetryButton?: boolean
}) {
  return (
    <StateMessage
      error
      icon="tabler:alert-triangle"
      title={message}
      action={
        showRetryButton ? (
          <Button
            icon="tabler:refresh"
            namespace={false}
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        ) : undefined
      }
    />
  )
}
