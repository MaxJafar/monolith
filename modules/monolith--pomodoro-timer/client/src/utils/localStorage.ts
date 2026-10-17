export type SubSessionType = 'work' | 'short_break' | 'long_break'

export interface LocalSubSession {
  type: SubSessionType
  durationElapsed: number
  ended: string
  isCompleted: boolean
}

export interface LocalTimerState {
  sessionId: string
  timeLeft: number
  isRunning: boolean
  subSessionType: SubSessionType
  pomodoroCount: number
  subSessions: LocalSubSession[]
  currentSubSessionStarted: string
  sessionKey: number
}

const STORAGE_KEY = 'pomodoroTimer_state'

export function getLocalTimerState(): LocalTimerState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) return null

    return JSON.parse(stored) as LocalTimerState
  } catch {
    return null
  }
}

export function saveLocalTimerState(state: LocalTimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage might be full or unavailable
    console.warn('Failed to save timer state to localStorage')
  }
}

export function clearLocalTimerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    console.warn('Failed to clear timer state from localStorage')
  }
}

export function initializeLocalTimerState(
  sessionId: string,
  session: {
    workDuration: number
    shortBreakDuration: number
    longBreakDuration: number
    pomodoroCount: number
  }
): LocalTimerState {
  return {
    sessionId,
    timeLeft: session.workDuration * 60,
    isRunning: false,
    subSessionType: 'work',
    pomodoroCount: session.pomodoroCount,
    subSessions: [],
    currentSubSessionStarted: new Date().toISOString(),
    sessionKey: 0
  }
}
