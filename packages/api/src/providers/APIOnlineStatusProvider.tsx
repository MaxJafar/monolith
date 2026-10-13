import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import { useAPIEndpoint } from './APIEndpointProvider'
import { checkAPIStatus } from './apiStatus'

interface IAPIOnlineStatus {
  isOnline: boolean | 'loading'
  environment: {
    server: 'production' | 'development' | null
    client: 'production' | 'development' | null
  }
  retry: () => void
}

const APIOnlineStatusContext = createContext<IAPIOnlineStatus | undefined>(
  undefined
)

export function APIOnlineStatusProvider({
  clientEnvironment,
  children
}: {
  clientEnvironment: 'production' | 'development' | null
  children: React.ReactNode
}) {
  const apiEndpoint = useAPIEndpoint()
  const [isOnline, setIsOnline] = useState<boolean | 'loading'>('loading')

  const [environment, setEnvironment] = useState<
    'production' | 'development' | null
  >(null)

  const [attempt, setAttempt] = useState(0)

  const handleRetry = useCallback(() => {
    setAttempt(current => current + 1)
  }, [])
  useEffect(() => {
    let active = true
    setIsOnline('loading')
    void checkAPIStatus(apiEndpoint).then(status => {
      if (!active) return
      setEnvironment(status === false ? null : status)
      setIsOnline(status !== false)
    })

    return () => {
      active = false
    }
  }, [apiEndpoint, attempt])

  return (
    <APIOnlineStatusContext
      value={{
        isOnline,
        environment: {
          server: environment,
          client: clientEnvironment
        },
        retry: handleRetry
      }}
    >
      {children}
    </APIOnlineStatusContext>
  )
}

export function useAPIOnlineStatus(): IAPIOnlineStatus {
  const context = useContext(APIOnlineStatusContext)

  if (context === undefined) {
    throw new Error(
      'useAPIOnlineStatus must be used within a APIOnlineStatusProvider'
    )
  }

  return context
}
