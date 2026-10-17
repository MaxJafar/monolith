import { useAuth } from '@monolith/api'
import type { ReactNode } from 'react'

import { RoomsEncryptionProvider } from './RoomsEncryption'
import { RoomsNotificationsProvider } from './RoomsNotifications'
import { RoomsCallProvider } from './calls/RoomsCallProvider'

export function RoomsRuntime({ children }: { children: ReactNode }) {
  const { userData } = useAuth()

  return (
    <RoomsEncryptionProvider key={userData?.id}>
      <RoomsCallProvider>
        <RoomsNotificationsProvider>{children}</RoomsNotificationsProvider>
      </RoomsCallProvider>
    </RoomsEncryptionProvider>
  )
}
