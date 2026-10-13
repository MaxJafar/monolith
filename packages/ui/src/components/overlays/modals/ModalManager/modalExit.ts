/** Remove a closed modal even when the browser suppresses transition events. */
export function scheduleModalExit(
  onExited: () => void,
  reducedMotion: boolean
) {
  const timer = setTimeout(onExited, reducedMotion ? 0 : 350)

  return () => clearTimeout(timer)
}
