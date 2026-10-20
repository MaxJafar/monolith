import { useEncryption } from '@monolith/api'

import { EmptyStateScreen, LoadingScreen } from '@/components/feedback'

export function EncryptionWrapper({ children }: { children: React.ReactNode }) {
  const { ready, error } = useEncryption()

  if (error) {
    return (
      <EmptyStateScreen
        CTAButtonProps={{
          children: 'Retry',
          namespace: false,
          onClick: () => window.location.reload(),
          icon: 'tabler:refresh'
        }}
        icon="tabler:lock-off"
        message={{
          title: 'Encryption failed',
          description: error
        }}
      />
    )
  }

  if (!ready) {
    return <LoadingScreen message="Initializing end-to-end encryption..." />
  }

  return children
}
