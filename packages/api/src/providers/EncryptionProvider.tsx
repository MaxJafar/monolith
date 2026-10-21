// SPDX-License-Identifier: 0BSD
import { type ReactNode, createContext, useContext, useMemo } from 'react'

import { initializeEncryption } from '../crypto/encryption'
import { useConnectionProbe } from './useConnectionProbe'

type EncryptionState = { ready: boolean; error: string | null }
const EncryptionContext = createContext<EncryptionState | undefined>(undefined)

export function EncryptionProvider({
  apiHost,
  children
}: {
  apiHost: string
  children: ReactNode
}) {
  const result = useConnectionProbe(apiHost, initializeEncryption)
  const state = useMemo<EncryptionState>(
    () => ({
      ready: result.state === 'ready',
      error:
        result.state === 'failed'
          ? result.error instanceof Error
            ? result.error.message
            : 'Encryption initialization failed'
          : null
    }),
    [result]
  )
  return <EncryptionContext value={state}>{children}</EncryptionContext>
}
export function useEncryption(): EncryptionState {
  const state = useContext(EncryptionContext)
  if (!state) throw new Error('useEncryption requires EncryptionProvider')
  return state
}
