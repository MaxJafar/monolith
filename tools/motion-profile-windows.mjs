// Measures the actual WebView2 window while WebDriver sends native input.
// Reports rendering cadence separately from the display's refresh capability.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { remote } from 'webdriverio'

const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const widgets = JSON.parse(
  readFileSync('.temp/widgets-webkit-canonical.json', 'utf8')
)
const driver = spawn(
  resolve(process.env.USERPROFILE, '.cargo/bin/tauri-driver.exe'),
  [
    '--native-driver',
    resolve(
      '.temp/toolchains/edgedriver',
      process.env.WEBVIEW2_VERSION || '155.0.4283.45',
      'msedgedriver.exe'
    )
  ],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }
)
driver.stderr.on('data', chunk => process.stderr.write(chunk))
let browser
const samples = []
try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch('http://127.0.0.1:4444/status')
      break
    } catch {
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }
  browser = await remote({
    hostname: '127.0.0.1',
    port: 4444,
    logLevel: 'error',
    connectionRetryCount: 0,
    capabilities: {
      'tauri:options': {
        application:
          process.env.MONOLITH_DESKTOP_EXECUTABLE ||
          resolve('apps/desktop/src-tauri/target/release/monolith-desktop.exe')
      }
    }
  })
  await browser.waitUntil(async () => !!(await browser.$('body').getText()), {
    timeout: 30000
  })
  await browser.pause(2500)
  if (await browser.$('#server').isExisting()) {
    await browser.$('#server').setValue(fixture.origin)
    await browser.$('button[type="submit"]').click()
  }
  await browser.waitUntil(
    async () =>
      (await browser.$('#email').isExisting()) ||
      (await browser.$('.monolith-workspace-tabs').isExisting()),
    { timeout: 30000 }
  )
  if (await browser.$('#email').isExisting()) {
    await browser.waitUntil(
      async () => {
        if (await browser.$('.monolith-workspace-tabs').isExisting())
          return true
        try {
          await browser.$('#email').setValue(fixture.email)
          await browser.$('#password').setValue(fixture.password)
          await browser.$('button[type="submit"]').click()
          return true
        } catch (error) {
          if (String(error).includes('stale element')) return false
          throw error
        }
      },
      { timeout: 30000, interval: 300 }
    )
  }
  await browser.$('.monolith-workspace-tabs').waitForExist({ timeout: 60000 })
  await browser.execute(path => {
    history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `/dashboard?workspace=${widgets.workspace}`)
  await browser.$('.monolith-widget-grid').waitForExist({ timeout: 45000 })
  await browser.pause(2000)

  async function measure(name, action) {
    await browser.execute(() => {
      const state = {
        frames: [],
        longTasks: [],
        longAnimationFrames: [],
        events: {},
        last: 0,
        raf: 0,
        visible: document.visibilityState,
        observer: null
      }
      const tick = now => {
        if (state.last) state.frames.push(now - state.last)
        state.last = now
        state.raf = requestAnimationFrame(tick)
      }
      state.raf = requestAnimationFrame(tick)
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        state.observer = new PerformanceObserver(list =>
          state.longTasks.push(
            ...list.getEntries().map(entry => entry.duration)
          )
        )
        state.observer.observe({ type: 'longtask' })
      }
      if (
        PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
      ) {
        state.frameObserver = new PerformanceObserver(list =>
          state.longAnimationFrames.push(
            ...list.getEntries().map(entry => entry.toJSON())
          )
        )
        state.frameObserver.observe({ type: 'long-animation-frame' })
      }
      state.onEvent = event => {
        state.events[event.type] = (state.events[event.type] || 0) + 1
      }
      for (const type of ['pointermove', 'dragover', 'scroll', 'wheel'])
        document.addEventListener(type, state.onEvent, {
          passive: true,
          capture: true
        })
      window.__motionSample = state
    })
    await action()
    const sample = await browser.execute(() => {
      const state = window.__motionSample
      cancelAnimationFrame(state.raf)
      state.observer?.disconnect()
      state.frameObserver?.disconnect()
      for (const type of ['pointermove', 'dragover', 'scroll', 'wheel'])
        document.removeEventListener(type, state.onEvent, true)
      return {
        intervals: state.frames,
        longTasks: state.longTasks,
        longAnimationFrames: state.longAnimationFrames,
        events: state.events,
        visible: state.visible,
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio
      }
    })
    const sorted = [...sample.intervals].sort((a, b) => a - b)
    const quantile = value =>
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ||
      0
    const median = quantile(0.5)
    const summary = {
      name,
      frames: sorted.length,
      medianMs: median,
      p95Ms: quantile(0.95),
      p99Ms: quantile(0.99),
      maxMs: sorted.at(-1),
      missedCadenceFrames: sorted.filter(value => value > median * 1.5).length,
      over120BudgetFrames: sorted.filter(value => value > 9.5).length,
      ...sample
    }
    samples.push(summary)
    writeFileSync(
      process.env.MONOLITH_MOTION_OUTPUT || '.temp/motion-windows.json',
      JSON.stringify(
        {
          platform: 'Windows WebView2',
          capturedAt: new Date().toISOString(),
          samples
        },
        null,
        2
      )
    )
    console.log(JSON.stringify({ ...summary, intervals: undefined }))
  }
  async function drag(element, dx, dy, seconds = 3) {
    const rect = await element.getLocation(),
      size = await element.getSize()
    const x = Math.round(rect.x + size.width / 2),
      y = Math.round(rect.y + size.height / 2)
    const actions = [
      { type: 'pointerMove', duration: 0, x, y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 100 }
    ]
    for (let i = 1; i <= 24; i++)
      actions.push({
        type: 'pointerMove',
        duration: Math.round((seconds * 1000) / 24),
        x: Math.round(x + (dx * i) / 24),
        y: Math.round(y + (dy * i) / 24)
      })
    actions.push({ type: 'pointerUp', button: 0 })
    await browser.performActions([
      {
        type: 'pointer',
        id: 'motion',
        parameters: { pointerType: 'mouse' },
        actions
      }
    ])
    await browser.releaseActions()
    await browser.pause(700)
  }
  await measure('idle', () => browser.pause(3000))
  const sidebar = await browser.$(
    '[role="separator"][aria-label="Resize sidebar"]'
  )
  await sidebar.doubleClick()
  await browser.pause(500)
  const originalWidth = Number(await sidebar.getAttribute('aria-valuenow'))
  await measure('sidebar-resize', async () => {
    await drag(sidebar, 90, 0)
    assert.ok(
      Number(await sidebar.getAttribute('aria-valuenow')) > originalWidth + 30,
      'Sidebar must visibly resize'
    )
    await drag(sidebar, -90, 0)
    assert.ok(
      Math.abs(
        Number(await sidebar.getAttribute('aria-valuenow')) - originalWidth
      ) <= 2,
      'Sidebar must resize in both directions'
    )
  })
  console.log(
    JSON.stringify({
      sidebarBefore: originalWidth,
      sidebarAfter: Number(await sidebar.getAttribute('aria-valuenow'))
    })
  )
  await sidebar.doubleClick()
  const edit = await browser.$('button[role="switch"]')
  // The shared widget board exposes an accessible checkbox in both hosts.
  const editing = await browser.$(
    'input[aria-label="Edit layout"],button[aria-label="Edit layout"],[role="checkbox"][aria-label="Edit layout"]'
  )
  if (await editing.isExisting()) await editing.click()
  else {
    const label = await browser.$('button*=Edit layout')
    if (await label.isExisting()) await label.click()
    else if (await edit.isExisting()) await edit.click()
  }
  const resize = await browser.$(
    '.monolith-widget-grid [aria-label="Resize Workspace pulse"]'
  )
  await resize.waitForExist({ timeout: 10000 })
  await resize.doubleClick()
  const tileHeight = () =>
    browser.execute(
      element =>
        element.closest('[data-widget-id]').getBoundingClientRect().height,
      resize
    )
  const beforeHeight = await tileHeight()
  await measure('widget-resize', async () => {
    await drag(resize, 0, 100)
    assert.ok(
      (await tileHeight()) > beforeHeight + 70,
      'Widget must visibly resize'
    )
    await drag(resize, 0, -100)
  })
  const move = await browser.$(
    '.monolith-widget-grid [aria-label="Move Action agenda"]'
  )
  const destination = await browser.$(
    '.monolith-widget-grid [aria-label="Move Workspace pulse"]'
  )
  const sourcePoint = await move.getLocation(),
    destinationPoint = await destination.getLocation()
  const order = () =>
    browser.execute(() =>
      Array.from(
        document.querySelectorAll('.monolith-widget-grid > [data-widget-id]')
      )
        .map(tile => tile.dataset.widgetId)
        .join(',')
    )
  const beforeOrder = await order()
  await measure('widget-drag', async () => {
    await drag(
      move,
      destinationPoint.x - sourcePoint.x,
      destinationPoint.y - sourcePoint.y
    )
  })
  assert.notEqual(
    await order(),
    beforeOrder,
    'Drag must reorder actual widgets'
  )
  const undo = await browser.$('button*=Undo layout change')
  if (await undo.isEnabled()) await undo.click()
  await measure('scroll', async () => {
    for (const deltaY of [650, 650, -650, -650]) {
      await browser.performActions([
        {
          type: 'wheel',
          id: 'scroll',
          actions: Array.from({ length: 40 }, () => ({
            type: 'scroll',
            x: 900,
            y: 600,
            deltaX: 0,
            deltaY: Math.round(deltaY / 40),
            duration: 16
          }))
        }
      ])
      await browser.pause(300)
    }
  })
  const target =
    process.env.MONOLITH_MOTION_OUTPUT || '.temp/motion-windows.json'
  writeFileSync(
    target,
    JSON.stringify(
      {
        platform: 'Windows WebView2',
        capturedAt: new Date().toISOString(),
        samples
      },
      null,
      2
    )
  )
} catch (error) {
  console.error(String(error).split('\n').slice(0, 3).join('\n'))
  if (browser)
    await browser
      .saveScreenshot('.temp/motion-windows-failure.png')
      .catch(() => undefined)
  process.exitCode = 1
} finally {
  if (browser) await browser.deleteSession().catch(() => undefined)
  driver.kill()
}
