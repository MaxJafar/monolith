// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { useEncryption } from '@monolith/api'

import { LoadingScreen } from '@/components/feedback'
import { StateMessage } from '@/components/feedback/StateMessage'
import { Button } from '@/components/inputs/Button'

export function EncryptionWrapper({ children }: { children: ReactNode }) {
  const status = useEncryption()
  if (!status.error && status.ready) return children
  if (!status.error)
    return <LoadingScreen message="Initializing end-to-end encryption..." />
  return (
    <StateMessage
      error
      icon="tabler:lock-off"
      title="Encryption failed"
      detail={status.error}
      action={
        <Button
          icon="tabler:refresh"
          variant="secondary"
          onClick={() => location.reload()}
        >
          Retry
        </Button>
      }
    />
  )
}
