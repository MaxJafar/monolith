type Status =
  | { status: 'pending'; expiresAt: string }
  | { status: 'approved'; accessToken: string }
  | { status: 'expired' | 'not_found' }

interface Ports {
  status: () => Promise<Status>
  claim: () => Promise<{ accessToken: string }>
  countdown: (seconds: number) => void
  claiming: () => void
  approved: (token: string) => Promise<void>
  expired: () => void
  error: () => void
}

/** One claim gate shared by socket notifications and sequential status checks. */
export function watchQRSession(expiresAt: string, ports: Ports) {
  let active = true
  let claiming = false
  let deadline = Date.parse(expiresAt)
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let clockTimer: ReturnType<typeof setInterval> | undefined

  // Callbacks can change these flags while a request is suspended.
  const isActive = () => active
  const canPoll = () => active && !claiming

  function dispose() {
    active = false
    clearTimeout(pollTimer)
    clearInterval(clockTimer)
  }

  function expire() {
    if (!isActive()) return
    dispose()
    ports.expired()
  }

  function tick() {
    if (!canPoll()) return

    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))

    if (!Number.isFinite(seconds) || seconds === 0) expire()
    else ports.countdown(seconds)
  }

  async function notifyApproval() {
    if (!canPoll()) return
    claiming = true
    clearTimeout(pollTimer)
    clearInterval(clockTimer)
    ports.claiming()

    try {
      const result = await ports.claim()

      if (isActive()) await ports.approved(result.accessToken)
    } catch {
      if (isActive()) ports.error()
    } finally {
      dispose()
    }
  }

  async function poll() {
    if (!canPoll()) return

    try {
      const result = await ports.status()

      if (!canPoll()) return
      if (result.status === 'approved') await notifyApproval()
      else if (result.status === 'pending') {
        if (Number.isFinite(Date.parse(result.expiresAt)))
          deadline = Date.parse(result.expiresAt)
        tick()
      } else expire()
    } catch {
      /* Temporary connection loss is retried until the session expires. */
    } finally {
      if (canPoll())
        pollTimer = setTimeout(() => {
          void poll()
        }, 3000)
    }
  }

  tick()

  if (isActive()) {
    clockTimer = setInterval(tick, 1000)
    void poll()
  }

  return { dispose, notifyApproval }
}
