import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Socket, io } from 'socket.io-client'

import {
  clearAccessToken,
  getAccessToken,
  resolveSocketUrl,
  setAccessToken,
  useAuth
} from '@monolith/api'
import { toast } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import {
  clearStoredSession,
  getStoredSession,
  storeSession
} from '../utils/QRSessionMngr'
import getBrowserInfo from '../utils/getBrowserInfo'
import { watchQRSession } from '../utils/qrConnection'

export type QRStatus =
  'loading' | 'ready' | 'waiting' | 'approved' | 'expired' | 'error'

interface Snapshot {
  status: QRStatus
  qrData: string
  timeLeft: number
}

export default function useQRLoginSession({
  onSuccess
}: {
  onSuccess: () => void
}) {
  const { t } = useTranslation('common.auth')
  const { setAuth, setUserData } = useAuth()
  const [revision, setRevision] = useState(0)

  const [snapshot, setSnapshot] = useState<Snapshot>({
    status: 'loading',
    qrData: '',
    timeLeft: 0
  })

  const callbacks = useRef({ t, onSuccess })
  const cancel = useRef<() => void>(() => {})

  useEffect(() => {
    callbacks.current = { t, onSuccess }
  }, [t, onSuccess])
  useEffect(() => {
    let disposed = false
    const isDisposed = () => disposed
    let completed = false
    let claimedToken: string | undefined
    let socket: Socket | undefined
    let connection: ReturnType<typeof watchQRSession> | undefined

    function disconnect() {
      socket?.removeAllListeners()
      socket?.disconnect()
    }

    function cleanup() {
      disposed = true
      connection?.dispose()
      disconnect()
      if (!completed && claimedToken && getAccessToken() === claimedToken)
        clearAccessToken()
    }

    function terminal(status: 'expired' | 'error') {
      if (isDisposed()) return
      connection?.dispose()
      clearStoredSession()
      disconnect()
      setSnapshot(current => ({ ...current, status, timeLeft: 0 }))
    }

    cancel.current = cleanup
    setSnapshot({ status: 'loading', qrData: '', timeLeft: 0 })
    void (async () => {
      let session = getStoredSession()

      if (!session) {
        const created = await workspaceAPI.auth.qrLogin.register.mutateRaw({
          browserInfo: getBrowserInfo()
        })
        session = {
          ...created,
          qrData: JSON.stringify({
            type: 'monolith-qr-login',
            v: 1,
            sessionId: created.sessionId
          })
        }
      }
      if (isDisposed()) return
      storeSession(session)
      const sessionId = session.sessionId
      setSnapshot({ status: 'ready', qrData: session.qrData, timeLeft: 0 })
      connection = watchQRSession(session.expiresAt, {
        status: () =>
          workspaceAPI.auth.qrLogin.status.input({ sessionId }).queryRaw(),
        claim: () => workspaceAPI.auth.qrLogin.claim.mutateRaw({ sessionId }),
        countdown: timeLeft =>
          setSnapshot(current => ({ ...current, timeLeft })),
        claiming: () =>
          setSnapshot(current => ({ ...current, status: 'waiting' })),
        expired: () => terminal('expired'),
        error: () => {
          terminal('error')
          toast.error(callbacks.current.t('messages.unknownError'))
        },
        approved: async token => {
          if (isDisposed()) return
          claimedToken = token
          setAccessToken(token)

          try {
            const { userData } = await workspaceAPI.user.me.queryRaw()

            if (isDisposed()) return
            completed = true
            clearStoredSession()
            disconnect()
            setSnapshot(current => ({ ...current, status: 'approved' }))
            setUserData(userData)
            setAuth(true)
            toast.success(
              callbacks.current.t('messages.welcomeBack', {
                name: userData.name
              })
            )
            callbacks.current.onSuccess()
          } catch (error) {
            if (getAccessToken() === token) clearAccessToken()
            throw error
          }
        }
      })
      if (Date.parse(session.expiresAt) <= Date.now()) return

      const host = import.meta.env.VITE_API_HOST || window.location.origin
      socket = io(resolveSocketUrl(host, window.location.origin, '/qr-login'), {
        transports: ['websocket', 'polling']
      })
      socket.on('connect', () => {
        socket?.emit('joinQRSession', sessionId)
      })
      socket.on('sessionApproved', () => {
        void connection?.notifyApproval()
      })
    })().catch(() => {
      terminal('error')
    })

    return cleanup
  }, [revision, setAuth, setUserData])

  const refreshSession = useCallback(() => {
    cancel.current()
    clearStoredSession()
    setRevision(current => current + 1)
  }, [])

  return { ...snapshot, refreshSession }
}
