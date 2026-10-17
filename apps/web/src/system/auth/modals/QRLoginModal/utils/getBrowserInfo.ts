/** A display hint for device approval, never an authentication signal. */
export default function getBrowserInfo(agent = navigator.userAgent): string {
  const browser = [
    ['Edge', /Edg(?:e|A|iOS)?\//],
    ['Opera', /(?:OPR|Opera)\//],
    ['Firefox', /(?:Firefox|FxiOS)\//],
    ['Chrome', /(?:Chrome|CriOS)\//],
    ['Safari', /Safari\//]
  ] as const
  const system = [
    ['iOS', /iPhone|iPad|iPod/],
    ['Android', /Android/],
    ['Windows', /Windows/],
    ['macOS', /Macintosh|Mac OS/],
    ['Linux', /Linux/]
  ] as const
  return (
    (browser.find(([, pattern]) => pattern.test(agent))?.[0] ?? 'Browser') +
    ' on ' +
    (system.find(([, pattern]) => pattern.test(agent))?.[0] ?? 'device')
  )
}
