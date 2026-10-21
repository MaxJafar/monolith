// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { useAPIOnlineStatus } from '@monolith/api'

import { EmptyStateScreen, LoadingScreen } from '@/components/feedback'

export function APIOnlineStatusWrapper({ children }: { children: ReactNode }) {
  const connection = useAPIOnlineStatus()
  switch (connection.isOnline) {
    case true:
      return children
    case 'loading':
      return <LoadingScreen message="Connecting to your Monolith server…" />
    default:
      return (
        <EmptyStateScreen
          icon="tabler:wifi-off"
          message={{
            title: 'Your server is unavailable',
            description: 'Check your connection, then try again.'
          }}
          CTAButtonProps={{
            children: 'Retry',
            namespace: false,
            icon: 'tabler:refresh',
            onClick: connection.retry
          }}
        />
      )
  }
}
