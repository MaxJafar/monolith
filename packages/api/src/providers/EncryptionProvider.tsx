import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { hasServerPublicKey, initializeEncryption } from '../crypto/encryption'

type Status = { ready: boolean; error: string | null }
const EncryptionStatus = createContext<Status | null>(null)

export function EncryptionProvider({
  apiHost,
  children
}: {
  apiHost: string
  children: ReactNode
}) {
  const [status, setStatus] = useState<Status>(() => ({
    ready: hasServerPublicKey(),
    error: null
  }))
  useEffect(() => {
    let active = true
    setStatus({ ready: false, error: null })
    Promise.resolve()
      .then(() => initializeEncryption(apiHost))
      .then(() => {
        if (active) setStatus({ ready: true, error: null })
      })
      .catch(error => {
        if (active)
          setStatus({
            ready: false,
            error:
              error instanceof Error
                ? error.message
                : 'Encryption initialization failed'
          })
      })
    return () => {
      active = false
    }
  }, [apiHost])
  return <EncryptionStatus value={status}>{children}</EncryptionStatus>
}

export function useEncryption(): Status {
  const state = useContext(EncryptionStatus)
  if (state === null)
    throw new Error('useEncryption requires EncryptionProvider')
  return state
}
