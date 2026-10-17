export function playBeep(enabled = true): boolean {
  if (!enabled) return true
  if (typeof AudioContext === 'undefined') return false

  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator(),
      gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.08
    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.onended = () => {
      void context.close().catch(() => {})
    }
    void context.resume().catch(() => {
      void context.close().catch(() => {})
    })
    oscillator.start()
    oscillator.stop(context.currentTime + 0.15)

    return true
  } catch {
    return false
  }
}
