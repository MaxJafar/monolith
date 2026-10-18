import { useSocketContext } from '@monolith/api'
import { Box, Button, Flex, Stack, Text } from '@monolith/ui'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRoomsEncryption } from '../RoomsEncryption'
import { type CallScope, type CallView, RoomCall } from './RoomCall'

function useCallState() {
  const socket = useSocketContext()
  const encryption = useRoomsEncryption()
  const session = useRef<RoomCall | null>(null)
  const [view, setView] = useState<CallView | null>(null)
  const [scope, setScope] = useState<CallScope | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const starting = useRef(false)
  const generation = useRef(0)

  useEffect(
    () => () => {
      generation.current++
      session.current?.stop()
    },
    []
  )
  useEffect(() => {
    if (!scope || view?.status !== 'joined') return

    const timer = window.setInterval(
      () => {
        void workspaceAPI.rooms.callState
          .input(scope)
          .query()
          .then(config => session.current?.refreshRelay(config.iceServers))
          .catch(() => session.current?.stop())
      },
      30 * 60 * 1000
    )

    return () => window.clearInterval(timer)
  }, [scope, view?.status])

  async function start(target: CallScope, name: string, video: boolean) {
    if (starting.current || (session.current && view?.status !== 'ended'))
      return
    starting.current = true
    setBusy(true)
    setError('')
    const version = ++generation.current

    try {
      if (!encryption.ready || !encryption.identity)
        throw Error('Set up Rooms encryption before joining a call')

      const config = await workspaceAPI.rooms.callState.input(target).query()

      if (version !== generation.current) return
      setScope(target)
      setName(name)
      const call = new RoomCall(
        socket,
        encryption.identity,
        target,
        config.iceServers,
        setView
      )
      session.current = call
      await call.start(video)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      starting.current = false
      setBusy(false)
    }
  }

  function dismiss() {
    generation.current++
    session.current?.stop()
    session.current = null
    setView(null)
    setScope(null)
    setError('')
  }

  return { view, scope, name, busy, error, start, dismiss, session }
}

const Calls = createContext<ReturnType<typeof useCallState> | null>(null)

export function useRoomCalls() {
  const value = useContext(Calls)

  if (!value) throw Error('Rooms calls provider missing')

  return value
}

export function RoomsCallProvider({ children }: { children: ReactNode }) {
  const value = useCallState()

  return (
    <Calls value={value}>
      {children}
      <CallPanel />
    </Calls>
  )
}

function Media({
  stream,
  local = false,
  name,
  screen = false
}: {
  stream: MediaStream
  local?: boolean
  name: string
  screen?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const video = ref.current

    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => setBlocked(true))

    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <Stack flex="1" gap="xs" minWidth="0">
      {/* Live media has no prerecorded caption track. */}
      {}
      <Box
        ref={ref}
        autoPlay
        playsInline
        aria-label={name}
        as="video"
        bg="black"
        height={screen ? '20rem' : '10rem'}
        muted={local}
        r="md"
        width="100%"
      />
      <Text truncate color="muted" size="sm">
        {name}
      </Text>
      {blocked && (
        <Button
          namespace="common.rooms"
          onClick={() => {
            void ref.current?.play().then(() => setBlocked(false))
          }}
        >
          playCallAudio
        </Button>
      )}
    </Stack>
  )
}

function CallPanel() {
  const { t } = useTranslation('common.rooms')
  const { view, scope, name, session, dismiss } = useRoomCalls()
  const [expanded, setExpanded] = useState(true)

  if (!view || !scope) return null

  const active = view.status !== 'ended'
  const screenVisible = (stream: MediaStream) =>
    stream
      .getVideoTracks()
      .some(track => track.readyState === 'live' && !track.muted)

  return (
    <Box
      shadow
      aria-label={t('call')}
      bg={{ base: 'bg-50', dark: 'bg-900' }}
      bottom="1rem"
      maxHeight="80vh"
      overflowY="auto"
      p="md"
      position="fixed"
      r="lg"
      right="1rem"
      width="min(52rem, calc(100vw - 2rem))"
      zIndex="90"
    >
      <Stack gap="sm">
        <Flex align="center" gap="sm" justify="between" wrap="wrap">
          <Button
            as={Link}
            icon="lucide:phone"
            namespace={false}
            to={`/rooms?${new URLSearchParams({ workspace: scope.workspace_id, room: scope.room_id })}`}
            variant="plain"
          >
            {name}
          </Button>
          <Text color="muted" size="sm">
            {t(
              view.status === 'joining'
                ? 'joiningCall'
                : active
                  ? 'encryptedCall'
                  : 'callEnded'
            )}
          </Text>
          <Button
            aria-label={t(expanded ? 'collapseCall' : 'expandCall')}
            icon={expanded ? 'lucide:chevron-down' : 'lucide:chevron-up'}
            variant="plain"
            onClick={() => setExpanded(value => !value)}
          />
        </Flex>
        {/* Keep remote audio elements mounted when the panel is collapsed. */}
        {active && (
          <Box display={expanded ? 'block' : 'none'}>
            <Flex gap="sm" wrap="wrap">
              <Media local name={t('you')} stream={view.local} />
              {view.peers.map(peer => (
                <Stack key={peer.id} flex="1" gap="xs" minWidth="10rem">
                  <Media name={peer.name} stream={peer.media} />
                  <Text
                    color={peer.state === 'failed' ? 'dangerous' : 'muted'}
                    size="sm"
                  >
                    {t('connectionState.' + peer.state)}
                  </Text>
                </Stack>
              ))}
            </Flex>
            {view.sharing && (
              <Media local screen name={t('yourScreen')} stream={view.screen} />
            )}
            {view.peers
              .filter(peer => screenVisible(peer.screen))
              .map(peer => (
                <Media
                  key={'screen:' + peer.id}
                  screen
                  name={t('sharedScreen', { name: peer.name })}
                  stream={peer.screen}
                />
              ))}
          </Box>
        )}
        {active && (
          <Flex align="center" gap="sm" justify="center" wrap="wrap">
            <Button
              aria-pressed={view.muted}
              disabled={view.status === 'joining'}
              icon={view.muted ? 'lucide:mic-off' : 'lucide:mic'}
              namespace="common.rooms"
              variant="secondary"
              onClick={() => session.current?.toggleMute()}
            >
              {view.muted ? 'unmuteMicrophone' : 'muteMicrophone'}
            </Button>
            <Button
              aria-pressed={view.camera}
              disabled={view.status === 'joining'}
              icon={view.camera ? 'lucide:video' : 'lucide:video-off'}
              namespace="common.rooms"
              variant="secondary"
              onClick={() => {
                void session.current?.toggleCamera()
              }}
            >
              {view.camera ? 'stopCamera' : 'startCamera'}
            </Button>
            <Button
              aria-pressed={view.sharing}
              disabled={view.status === 'joining'}
              icon="lucide:monitor"
              namespace="common.rooms"
              variant="secondary"
              onClick={() => {
                void session.current?.shareScreen()
              }}
            >
              {view.sharing ? 'stopSharing' : 'shareScreen'}
            </Button>
            <Button
              dangerous
              icon="lucide:phone-off"
              namespace="common.rooms"
              onClick={dismiss}
            >
              leaveCall
            </Button>
          </Flex>
        )}
        {view.error && (
          <Text color="dangerous" role="alert" size="sm">
            {view.error}
          </Text>
        )}
        {!active && (
          <Button namespace="common.rooms" variant="plain" onClick={dismiss}>
            close
          </Button>
        )}
      </Stack>
    </Box>
  )
}
