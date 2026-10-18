import { readFileSync, writeFileSync } from 'node:fs'

const log = readFileSync(process.argv[2] ?? '.temp/refine-mac-motion-final4.log', 'utf8')
const phases = Object.fromEntries(
  [...log.matchAll(/MOTION (\w+) ([\d.]+)/g)].map(match => [
    match[1],
    Number(match[2]) * 1000
  ])
)
const batches = readFileSync(process.argv[3] ?? '.temp/motion-macos-final.ndjson', 'utf8')
  .trim()
  .split(/\r?\n/)
  .map(line => JSON.parse(line))
const frames = batches
  .filter(batch => batch.type === 'frames' && batch.visible)
  .flatMap(batch => {
    let time = Date.parse(batch.capturedAt)
    return [...batch.intervals].reverse().map(interval => {
      const result = { end: time, interval }
      time -= interval
      return result
    })
  })
const summary = (name, start, end) => {
  const intervals = frames
    .filter(frame => frame.end >= start && frame.end <= end)
    .map(frame => frame.interval)
    .sort((a, b) => a - b)
  const q = fraction =>
    intervals[
      Math.min(intervals.length - 1, Math.floor(intervals.length * fraction))
    ]
  return {
    name,
    frames: intervals.length,
    observedFps: intervals.length ? 1000 * intervals.length / intervals.reduce((sum, value) => sum + value, 0) : null,
    medianMs: q(0.5),
    p95Ms: q(0.95),
    p99Ms: q(0.99),
    maxMs: intervals.at(-1),
    missedCadenceFrames: intervals.filter(value => value > q(0.5) * 1.5).length
  }
}
const mac = {
  platform: 'macOS WKWebView',
  maximumFramesPerSecond: batches.find(batch => batch.type === 'display')
    ?.maximumFramesPerSecond,
  refreshPolicy: batches.find(batch => batch.type === 'refreshPolicy')?.policy,
  method:
    'Visible requestAnimationFrame intervals, approximate phase assignment from one-second native message batches and XCTest wall-clock markers. Phase boundaries may vary by a frame.',
  samples: [
    summary('idle', phases.idle, phases.idle_end),
    summary('widget-resize', phases.resize, phases.resize_end),
    summary('widget-drag', phases.drag, phases.drag_end),
    summary('scroll', phases.scroll, phases.end)
  ]
}
writeFileSync(process.argv[4] ?? '.temp/motion-macos-summary.json', JSON.stringify(mac, null, 2))
console.log(JSON.stringify(mac, null, 2))
