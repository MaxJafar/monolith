import { io } from '../../apps/web/node_modules/socket.io-client/build/esm/index.js'
import {
  type CallView,
  RoomCall
} from '../../apps/web/src/core/rooms/calls/RoomCall'
import { restoreRoomIdentity } from '../../packages/api/src/rooms/crypto'

const output = document.querySelector<HTMLPreElement>('#result')!
const button = document.querySelector<HTMLButtonElement>('#run')!
const log = (message: string) => {
  output.textContent += '\n' + message
}
const wait = async (check: () => boolean, label: string, timeout = 20000) => {
  const end = Date.now() + timeout

  while (!check()) {
    if (Date.now() > end) throw Error('Timeout: ' + label)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  log('PASS ' + label)
}
button.onclick = async () => {
  button.disabled = true
  output.textContent = 'Running with synthetic media only…'
  const calls: RoomCall[] = [],
    sockets: ReturnType<typeof io>[] = [],
    timers: number[] = [],
    tracks: MediaStreamTrack[] = [],
    audio: AudioContext[] = []

  let denyScreen = false

  try {
    const fixture = await fetch('/fixture').then(r => r.json())

    if (
      fixture.marker !== 'monolith-rooms-synthetic-media' ||
      fixture.expires < Date.now()
    )
      throw Error('Fixture unavailable')

    const canvasTrack = (label: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 180
      document.querySelector('#canvases')!.append(canvas)
      const context = canvas.getContext('2d')!

      let frame = 0
      timers.push(
        window.setInterval(() => {
          context.fillStyle = frame++ % 2 ? '#24534d' : '#164641'
          context.fillRect(0, 0, 320, 180)
          context.fillStyle = 'white'
          context.font = '18px sans-serif'
          context.fillText(label + ' · ' + frame, 16, 80)
        }, 100)
      )
      const track = canvas.captureStream(10).getVideoTracks()[0]!
      tracks.push(track)

      return track
    }
    const media = (name: string) => ({
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        const stream = new MediaStream()

        if (constraints.audio) {
          const ctx = new AudioContext()
          audio.push(ctx)
          const oscillator = ctx.createOscillator()
          const destination = ctx.createMediaStreamDestination()
          oscillator.frequency.value = 220
          oscillator.connect(destination)
          oscillator.start()
          const track = destination.stream.getAudioTracks()[0]!
          stream.addTrack(track)
          tracks.push(track)
        }
        if (constraints.video) stream.addTrack(canvasTrack(name + ' camera'))

        return stream
      },
      getDisplayMedia: async () => {
        if (denyScreen)
          throw new DOMException('Synthetic screen denial', 'NotAllowedError')

        return new MediaStream([canvasTrack(name + ' screen')])
      }
    })
    const states: (CallView | undefined)[] = [],
      peers: RTCPeerConnection[] = []

    for (const [index, person] of fixture.people.entries()) {
      const socket = io(window.location.origin, {
        transports: ['websocket'],
        auth: { token: person.token }
      })
      sockets.push(socket)
      await wait(
        () => socket.connected,
        'participant ' + (index + 1) + ' authenticated'
      )
      const identity = await restoreRoomIdentity(person.backup, person.password)
      const call = new RoomCall(
        socket,
        identity,
        fixture.scope,
        [],
        value => {
          states[index] = value
        },
        media('Participant ' + (index + 1)),
        config => {
          const pc = new RTCPeerConnection(config)
          peers.push(pc)

          return pc
        }
      )
      calls.push(call)
      await call.start(index !== 2)
      if (states[index]?.status !== 'joined')
        throw Error(states[index]?.error || 'Join failed')
      if (index)
        await wait(
          () =>
            states
              .slice(0, index + 1)
              .every(
                s =>
                  s?.peers.length === index &&
                  s.peers.every(p => p.state === 'connected')
              ),
          `${index + 1}-participant mesh connects`
        )
    }
    await wait(
      () =>
        states.every(s =>
          s!.peers.every(p => p.media.getAudioTracks().some(t => !t.muted))
        ),
      'audio reaches all three participants'
    )
    calls[0]!.toggleMute()
    if (!states[0]!.muted) throw Error('Mute failed')
    calls[0]!.toggleMute()
    log('PASS microphone mute/unmute')
    await calls[0]!.toggleCamera()
    if (states[0]!.camera) throw Error('Camera did not stop')
    await calls[0]!.toggleCamera()
    log('PASS camera stop/restart')
    await calls[0]!.shareScreen()
    await wait(
      () =>
        states[1]!.peers.some(p =>
          p.screen.getVideoTracks().some(t => !t.muted)
        ),
      'screen track reaches the other participant'
    ).catch(async error => {
      log(
        JSON.stringify(
          states.map(s => ({
            status: s?.status,
            error: s?.error,
            sharing: s?.sharing,
            peers: s?.peers.map(p => ({
              media: p.media
                .getTracks()
                .map(t => ({ kind: t.kind, muted: t.muted })),
              screen: p.screen
                .getTracks()
                .map(t => ({ kind: t.kind, muted: t.muted }))
            }))
          }))
        )
      )
      for (const pc of peers)
        log(
          JSON.stringify(
            pc.getTransceivers().map(t => ({
              mid: t.mid,
              direction: t.currentDirection,
              send: t.sender.track?.kind,
              receive: t.receiver.track.kind,
              muted: t.receiver.track.muted
            }))
          )
        )
      throw error
    })
    let bytes = 0,
      frames = 0
    for (const pc of peers)
      (await pc.getStats()).forEach(report => {
        if (report.type === 'inbound-rtp') {
          bytes += report.bytesReceived ?? 0
          frames += report.framesDecoded ?? 0
        }
      })
    if (!bytes || !frames) throw Error('No media packets decoded')
    log(`PASS real WebRTC media decoded (${bytes} bytes, ${frames} frames)`)
    await calls[0]!.stopScreen()
    if (states[0]!.sharing) throw Error('Share did not stop')
    log('PASS screen sharing stops')
    await calls[0]!.shareScreen()
    const displayTrack = states[0]!.screen.getVideoTracks()[0]!
    displayTrack.dispatchEvent(new Event('ended'))
    await wait(
      () => !states[0]!.sharing && displayTrack.readyState === 'ended',
      'browser stop-sharing event releases capture'
    )
    denyScreen = true
    await calls[0]!.shareScreen()
    if (
      states[0]!.status !== 'joined' ||
      // Call state is updated asynchronously by the supplied observer.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      states[0]!.sharing ||
      !states[0]!.error.includes('denial')
    )
      throw Error('Screen permission denial interrupted the call')
    log('PASS screen permission denial preserves the call')
    const identity = await restoreRoomIdentity(
      fixture.people[0].backup,
      fixture.people[0].password
    )

    let deniedState: CallView | undefined

    const denied = new RoomCall(
      sockets[0]!,
      identity,
      fixture.scope,
      [],
      s => {
        deniedState = s
      },
      {
        getUserMedia: async () => {
          throw new DOMException(
            'Synthetic permission denial',
            'NotAllowedError'
          )
        },
        getDisplayMedia: media('denied').getDisplayMedia
      }
    )
    await denied.start(false)
    if (
      deniedState?.status !== 'ended' ||
      !deniedState.error.includes('denial')
    )
      throw Error('Permission denial was not handled')
    log('PASS microphone permission denial')
    // A separate failed attempt must not tear down the existing call on a socket.
    sockets[2]!.disconnect()
    await wait(
      () => states[2]?.status === 'ended' && states[0]?.peers.length === 1,
      'disconnect stops capture and removes the peer'
    )
    calls.forEach(call => call.stop())
    await wait(
      () => tracks.every(track => track.readyState === 'ended'),
      'all capture tracks stop on hangup'
    )
    log('ALL MEDIA CHECKS PASSED')
  } catch (error) {
    log('FAIL ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    calls.forEach(call => call.stop())
    sockets.forEach(socket => socket.disconnect())
    tracks.forEach(track => track.stop())
    timers.forEach(clearInterval)
    for (const ctx of audio) await ctx.close()
    button.disabled = false
  }
}
