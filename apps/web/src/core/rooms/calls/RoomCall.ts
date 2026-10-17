/* eslint-disable @typescript-eslint/no-unnecessary-condition -- Browser media APIs vary by host; asynchronous socket/media events can change state across every await. */
import {
  type RoomIdentity,
  type RoomPrivateIdentity,
  signRoomValue,
  verifyRoomValue
} from '@monolith/api'
import type { Socket } from 'socket.io-client'

import { pinRoomIdentities } from '../encryptionStore'

export type CallScope = { workspace_id: string; room_id: string }

export type CallPeer = {
  socket_id: string
  actor_id: string
  name: string
  identity: RoomIdentity
}

type Signal = CallScope & {
  purpose: string
  call_id: string
  from: string
  actor_id: string
  to: string
  nonce: string
  timestamp: number
  payload: string
  signature: string
}

export type CallView = {
  status: 'joining' | 'joined' | 'ended'
  local: MediaStream
  screen: MediaStream
  muted: boolean
  camera: boolean
  sharing: boolean
  peers: {
    id: string
    name: string
    media: MediaStream
    screen: MediaStream
    state: RTCPeerConnectionState
  }[]
  error: string
}

type Connection = {
  peer: CallPeer
  pc: RTCPeerConnection
  makingOffer: boolean
  ignoreOffer: boolean
  settingAnswer: boolean
  polite: boolean
  queue: Promise<void>
  pendingIce: RTCIceCandidateInit[]
  media: MediaStream
  screen: MediaStream
  audio: RTCRtpSender | null
  camera: RTCRtpSender | null
  display: RTCRtpSender | null
  restarts: number
}

/** A bounded mesh: media goes directly between participants (or through the
 * configured opaque TURN relay). Signed SDP binds the DTLS fingerprint to the
 * same pinned identity that signs the participant's messages. */
export class RoomCall {
  private callId = ''
  private ended = false
  private joined = false
  private joinNonce = ''
  private connections = new Map<string, Connection>()
  private people = new Map<string, CallPeer>()
  private seen = new Set<string>()
  private local = new MediaStream()
  private screen = new MediaStream()
  private error = ''
  private busyCamera = false
  private busyScreen = false
  private signalQueue: Promise<void> = Promise.resolve()

  constructor(
    private socket: Socket,
    private identity: RoomPrivateIdentity,
    readonly scope: CallScope,
    private iceServers: RTCIceServer[],
    private change: (state: CallView) => void,
    private media: Pick<
      MediaDevices,
      'getUserMedia' | 'getDisplayMedia'
    > = navigator.mediaDevices,
    private createPeer: (
      configuration: RTCConfiguration
    ) => RTCPeerConnection = configuration =>
      new RTCPeerConnection(configuration)
  ) {}

  private publish() {
    this.change({
      status: this.ended ? 'ended' : this.joined ? 'joined' : 'joining',
      local: this.local,
      screen: this.screen,
      muted: !this.local.getAudioTracks().some(t => t.enabled),
      camera: this.local
        .getVideoTracks()
        .some(t => t.enabled && t.readyState === 'live'),
      sharing: this.screen.getVideoTracks().some(t => t.readyState === 'live'),
      peers: [...this.connections.values()].map(c => ({
        id: c.peer.socket_id,
        name: c.peer.name,
        media: c.media,
        screen: c.screen,
        state: c.pc.connectionState
      })),
      error: this.error
    })
  }
  private fail(error: unknown) {
    this.error = error instanceof Error ? error.message : String(error)
    this.publish()
  }
  private request<T>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) =>
      this.socket
        .timeout(10000)
        .emit(
          event,
          payload,
          (error: Error | null, result: T & { error?: string }) => {
            if (error || result?.error) reject(error ?? Error(result.error))
            else resolve(result)
          }
        )
    )
  }
  async start(video: boolean) {
    this.publish()

    try {
      if (!this.socket.connected || !this.socket.id)
        throw Error('Connect to the platform before joining a call')
      if (!this.media?.getUserMedia || typeof RTCPeerConnection === 'undefined')
        throw Error(
          'Calls require an HTTPS browser with camera and microphone support'
        )

      const stream = await this.media.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video
          ? { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false
      })

      if (this.ended) {
        stream.getTracks().forEach(t => t.stop())

        return
      }
      this.local = stream
      this.socket.on('rooms:call:joined', this.onJoined)
      this.socket.on('rooms:call:left', this.onLeft)
      this.socket.on('rooms:call:signal', this.onSignal)
      this.socket.on('rooms:call:ended', this.onEnded)
      this.socket.on('disconnect', this.onDisconnect)
      const request = {
        ...this.scope,
        video,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      }
      const proof = await signRoomValue(this.identity, {
        purpose: 'monolith/rooms/call/join/v1',
        socket_id: this.socket.id,
        ...request
      })

      if (this.ended) return
      this.joinNonce = request.nonce
      const response = await this.request<{
        call_id: string
        peers: CallPeer[]
      }>('rooms:call:join', { ...request, proof })

      if (this.ended) {
        this.socket.emit('rooms:call:leave', { nonce: this.joinNonce })

        return
      }
      this.callId = response.call_id
      this.joined = true

      for (const peer of response.peers) {
        await this.remember(peer)
        this.connection(peer)
      }
      this.publish()
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
      this.stop()
    }
  }
  private async remember(peer: CallPeer) {
    if (
      peer.identity.owner_id !== peer.actor_id ||
      peer.socket_id === this.socket.id
    )
      throw Error('Invalid call participant identity')
    await pinRoomIdentities(this.identity.owner_id, [peer.identity])
    this.people.set(peer.socket_id, peer)
  }
  private onJoined = (value: { call_id: string; peer: CallPeer }) => {
    if (this.ended || value.call_id !== this.callId) return
    this.signalQueue = this.signalQueue
      .then(() => this.remember(value.peer))
      .catch(error => this.fail(error))
  }
  private onLeft = (value: { call_id: string; socket_id: string }) => {
    if (value.call_id !== this.callId) return
    this.connections.get(value.socket_id)?.pc.close()
    this.connections.delete(value.socket_id)
    this.people.delete(value.socket_id)
    this.publish()
  }
  private onEnded = (value: { call_id: string; reason: string }) => {
    if (value.call_id === this.callId) {
      this.error = value.reason
      this.stop()
    }
  }
  private onDisconnect = () => {
    this.error =
      'The platform connection was interrupted. Rejoin to reconnect securely.'
    this.stop()
  }
  private async send(
    connection: Connection,
    payload: {
      description?: RTCSessionDescriptionInit
      candidate?: RTCIceCandidateInit
    }
  ) {
    if (this.ended) return

    const data = {
      call_id: this.callId,
      to: connection.peer.socket_id,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
      payload: JSON.stringify(payload)
    }
    const signature = await signRoomValue(this.identity, {
      purpose: 'monolith/rooms/call/signal/v1',
      ...this.scope,
      from: this.socket.id,
      actor_id: this.identity.owner_id,
      ...data
    })
    await this.request('rooms:call:signal', { ...data, signature })
  }
  private connection(peer: CallPeer, answering = false) {
    const existing = this.connections.get(peer.socket_id)

    if (existing) return existing

    const pc = this.createPeer({
      iceServers: this.iceServers,
      bundlePolicy: 'max-bundle'
    })
    // The answerer adopts the offered transceivers. Preallocating another set
    // creates duplicate media sections and makes camera/display roles ambiguous.
    const audio = answering
      ? null
      : pc.addTransceiver(this.local.getAudioTracks()[0] ?? 'audio', {
          direction: 'sendrecv',
          streams: [this.local]
        }).sender
    const camera = answering
      ? null
      : pc.addTransceiver(this.local.getVideoTracks()[0] ?? 'video', {
          direction: 'sendrecv',
          streams: [this.local]
        }).sender
    const display = answering
      ? null
      : pc.addTransceiver(this.screen.getVideoTracks()[0] ?? 'video', {
          direction: 'sendrecv',
          streams: [this.screen]
        }).sender
    const c: Connection = {
      peer,
      pc,
      audio,
      camera,
      display,
      makingOffer: false,
      ignoreOffer: false,
      settingAnswer: false,
      polite: this.socket.id! < peer.socket_id,
      queue: Promise.resolve(),
      pendingIce: [],
      media: new MediaStream(),
      screen: new MediaStream(),
      restarts: 0
    }
    this.connections.set(peer.socket_id, c)

    pc.onicecandidate = event => {
      if (event.candidate)
        void this.send(c, { candidate: event.candidate.toJSON() }).catch(
          error => this.fail(error)
        )
    }

    pc.onnegotiationneeded = async () => {
      if (!c.audio) return

      try {
        c.makingOffer = true
        await pc.setLocalDescription()
        await this.send(c, { description: pc.localDescription!.toJSON() })
      } catch (error) {
        if (!this.ended && pc.signalingState !== 'closed') this.fail(error)
      } finally {
        c.makingOffer = false
      }
    }

    pc.ontrack = event => {
      const videoTracks = pc
        .getTransceivers()
        .filter(t => t.receiver.track.kind === 'video')
      const stream =
        event.track.kind === 'video' &&
        videoTracks.indexOf(event.transceiver) === 1
          ? c.screen
          : c.media
      stream.addTrack(event.track)
      event.track.onunmute = () => this.publish()
      event.track.onmute = () => this.publish()

      event.track.onended = () => {
        stream.removeTrack(event.track)
        this.publish()
      }
      this.publish()
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && c.restarts++ < 2) pc.restartIce()
      this.publish()
    }
    this.publish()

    return c
  }
  private onSignal = (signal: Signal) => {
    this.signalQueue = this.signalQueue
      .then(async () => {
        if (
          this.ended ||
          signal.call_id !== this.callId ||
          signal.to !== this.socket.id ||
          signal.workspace_id !== this.scope.workspace_id ||
          signal.room_id !== this.scope.room_id ||
          signal.purpose !== 'monolith/rooms/call/signal/v1' ||
          Math.abs(Date.now() - signal.timestamp) > 60000 ||
          this.seen.has(signal.nonce)
        )
          return

        const peer = this.people.get(signal.from)
        const { signature, ...value } = signal

        if (
          !peer ||
          peer.actor_id !== signal.actor_id ||
          !(await verifyRoomValue(peer.identity, value, signature))
        )
          throw Error('A call signal failed identity verification')
        this.seen.add(signal.nonce)
        if (this.seen.size > 2048)
          this.seen.delete(this.seen.values().next().value!)

        const payload = JSON.parse(signal.payload) as {
          description?: RTCSessionDescriptionInit
          candidate?: RTCIceCandidateInit
        }
        const c = this.connection(peer, true),
          pc = c.pc

        if (payload.description) {
          const description = payload.description

          if (
            !['offer', 'answer'].includes(description.type) ||
            !description.sdp
          )
            throw Error('Invalid call description')

          const readyForOffer =
            !c.makingOffer &&
            (pc.signalingState === 'stable' || c.settingAnswer)
          const collision = description.type === 'offer' && !readyForOffer
          c.ignoreOffer = !c.polite && collision
          if (c.ignoreOffer) return
          c.settingAnswer = description.type === 'answer'
          await pc.setRemoteDescription(description)
          c.settingAnswer = false

          if (!c.audio) {
            const transceivers = pc.getTransceivers()

            if (
              transceivers.length !== 3 ||
              transceivers.map(t => t.receiver.track.kind).join(',') !==
                'audio,video,video'
            )
              throw Error('Invalid call media layout')

            const [audio, camera, display] = transceivers
            c.audio = audio!.sender
            c.camera = camera!.sender
            c.display = display!.sender
            for (const transceiver of transceivers)
              transceiver.direction = 'sendrecv'
            c.audio.setStreams(this.local)
            c.camera.setStreams(this.local)
            c.display.setStreams(this.screen)
            await Promise.all([
              c.audio.replaceTrack(this.local.getAudioTracks()[0] ?? null),
              c.camera.replaceTrack(this.local.getVideoTracks()[0] ?? null),
              c.display.replaceTrack(this.screen.getVideoTracks()[0] ?? null)
            ])
          }
          for (const candidate of c.pendingIce.splice(0))
            await pc.addIceCandidate(candidate)

          if (description.type === 'offer') {
            await pc.setLocalDescription()
            await this.send(c, { description: pc.localDescription!.toJSON() })
          }
        } else if (payload.candidate && !c.ignoreOffer) {
          if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate)
          else if (c.pendingIce.length < 100)
            c.pendingIce.push(payload.candidate)
        }
      })
      .catch(error => this.fail(error))
  }
  toggleMute() {
    const tracks = this.local.getAudioTracks()
    const enabled = !tracks.some(t => t.enabled)
    tracks.forEach(t => {
      t.enabled = enabled
    })
    this.publish()
  }
  async toggleCamera() {
    if (this.ended || this.busyCamera) return
    this.busyCamera = true

    try {
      const previous = this.local.getVideoTracks()[0]

      if (previous) {
        await Promise.all(
          [...this.connections.values()].map(c => c.camera?.replaceTrack(null))
        )
        previous.stop()
        this.local.removeTrack(previous)
      } else {
        const stream = await this.media.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        })

        if (this.ended) {
          stream.getTracks().forEach(t => t.stop())

          return
        }

        const track = stream.getVideoTracks()[0]!
        this.local.addTrack(track)
        await Promise.all(
          [...this.connections.values()].map(c => c.camera?.replaceTrack(track))
        )
      }
      this.publish()
    } catch (error) {
      this.fail(error)
    } finally {
      this.busyCamera = false
    }
  }
  async shareScreen() {
    if (this.ended || this.busyScreen) return
    if (this.screen.getTracks().length) return this.stopScreen()
    this.busyScreen = true

    try {
      if (!this.media.getDisplayMedia)
        throw Error('Screen sharing is unavailable in this browser')

      // Called directly from the share button to preserve the required gesture.
      const stream = await this.media.getDisplayMedia({
        video: true,
        audio: false
      })

      if (this.ended) {
        stream.getTracks().forEach(t => t.stop())

        return
      }
      this.screen = stream
      const track = stream.getVideoTracks()[0]!
      track.onended = () => {
        void this.stopScreen()
      }
      await Promise.all(
        [...this.connections.values()].map(c => c.display?.replaceTrack(track))
      )
      this.publish()
    } catch (error) {
      this.fail(error)
    } finally {
      this.busyScreen = false
    }
  }
  async stopScreen() {
    const old = this.screen
    this.screen = new MediaStream()
    old.getTracks().forEach(t => {
      t.onended = null
      t.stop()
    })
    await Promise.all(
      [...this.connections.values()].map(c =>
        c.display?.replaceTrack(null).catch(() => {})
      )
    )
    this.publish()
  }
  refreshRelay(servers: RTCIceServer[]) {
    if (this.ended) return
    this.iceServers = servers

    for (const c of this.connections.values()) {
      c.pc.setConfiguration({ iceServers: servers })
      c.pc.restartIce()
    }
  }
  stop() {
    if (this.ended) return
    this.ended = true
    if (this.joinNonce)
      this.socket.emit('rooms:call:leave', { nonce: this.joinNonce })
    this.socket.off('rooms:call:joined', this.onJoined)
    this.socket.off('rooms:call:left', this.onLeft)
    this.socket.off('rooms:call:signal', this.onSignal)
    this.socket.off('rooms:call:ended', this.onEnded)
    this.socket.off('disconnect', this.onDisconnect)
    for (const c of this.connections.values()) c.pc.close()
    this.connections.clear()
    for (const stream of [this.local, this.screen])
      stream.getTracks().forEach(t => {
        t.onended = null
        t.stop()
      })
    this.publish()
  }
}
