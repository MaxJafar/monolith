// Headed production-browser measurements with real input and visible layout assertions.
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const target = JSON.parse(
  readFileSync('.temp/widgets-webkit-canonical.json', 'utf8')
)
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 }
})
const page = await context.newPage()
const samples = []
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  await page.goto(target.url)
  await page.bringToFront()
  await expect(page.locator('.monolith-widget-grid')).toBeVisible()
  // Native input foregrounds the headed window before collecting idle frames.
  await page.getByRole('separator', { name: 'Resize sidebar' }).dblclick()
  await page.waitForTimeout(2500)
  async function measure(name, action) {
    await page.evaluate(() => {
      const sample = {
        intervals: [],
        longTasks: [],
        events: {},
        last: 0,
        raf: 0,
        visible: document.visibilityState
      }
      const tick = now => {
        if (sample.last) sample.intervals.push(now - sample.last)
        sample.last = now
        sample.raf = requestAnimationFrame(tick)
      }
      sample.raf = requestAnimationFrame(tick)
      sample.observer = new PerformanceObserver(list =>
        sample.longTasks.push(...list.getEntries().map(entry => entry.duration))
      )
      sample.observer.observe({ type: 'longtask' })
      sample.onEvent = event => {
        sample.events[event.type] = (sample.events[event.type] || 0) + 1
      }
      for (const type of ['pointermove', 'dragover', 'scroll', 'wheel'])
        document.addEventListener(type, sample.onEvent, {
          passive: true,
          capture: true
        })
      window.__motionSample = sample
    })
    await action()
    const sample = await page.evaluate(() => {
      const sample = window.__motionSample
      cancelAnimationFrame(sample.raf)
      sample.observer.disconnect()
      for (const type of ['pointermove', 'dragover', 'scroll', 'wheel'])
        document.removeEventListener(type, sample.onEvent, true)
      return {
        intervals: sample.intervals,
        longTasks: sample.longTasks,
        events: sample.events,
        visible: sample.visible
      }
    })
    assert.equal(sample.visible, 'visible')
    const sorted = [...sample.intervals].sort((a, b) => a - b)
    assert.ok(
      sorted.length >= 30,
      `${name}: the visible window must produce frames`
    )
    const q = fraction =>
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
    const result = {
      name,
      frames: sorted.length,
      medianMs: q(0.5),
      p95Ms: q(0.95),
      p99Ms: q(0.99),
      maxMs: sorted.at(-1),
      missedCadenceFrames: sorted.filter(ms => ms > q(0.5) * 1.5).length,
      ...sample
    }
    samples.push(result)
    console.log(JSON.stringify({ ...result, intervals: undefined }))
    writeFileSync(
      process.env.MONOLITH_MOTION_OUTPUT || '.temp/motion-web.json',
      JSON.stringify(
        {
          platform: 'Windows headed Chromium',
          capturedAt: new Date().toISOString(),
          samples
        },
        null,
        2
      )
    )
  }
  async function drag(handle, dx, dy) {
    const box = await handle.boundingBox()
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let step = 1; step <= 120; step++) {
      await page.mouse.move(x + (dx * step) / 120, y + (dy * step) / 120)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
    await page.waitForTimeout(700)
  }
  await measure('idle', () => page.waitForTimeout(3000))
  const sidebar = page.getByRole('separator', { name: 'Resize sidebar' })
  await sidebar.dblclick()
  const width = Number(await sidebar.getAttribute('aria-valuenow'))
  console.log(
    JSON.stringify({
      sidebarBefore: width,
      bounds: await sidebar.boundingBox()
    })
  )
  await measure('sidebar-resize', async () => {
    await drag(sidebar, 90, 0)
    assert.ok(Number(await sidebar.getAttribute('aria-valuenow')) > width + 30)
    await drag(sidebar, -90, 0)
    assert.ok(
      Math.abs(Number(await sidebar.getAttribute('aria-valuenow')) - width) <=
        2,
      'Sidebar must resize in both directions'
    )
  })
  await sidebar.dblclick()
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click()
  const resize = page.getByRole('button', {
    name: 'Resize Workspace pulse',
    exact: true
  })
  await resize.dblclick()
  const tile = resize.locator('xpath=ancestor::*[@data-widget-id]')
  const height = (await tile.boundingBox()).height
  await measure('widget-resize', async () => {
    await drag(resize, 0, 100)
    assert.ok((await tile.boundingBox()).height > height + 70)
    await drag(resize, 0, -100)
  })
  const order = () =>
    page
      .locator('.monolith-widget-grid > [data-widget-id]')
      .evaluateAll(tiles => tiles.map(tile => tile.dataset.widgetId).join(','))
  const before = await order()
  const move = page.getByRole('button', {
    name: 'Move Action agenda',
    exact: true
  })
  const from = await move.boundingBox(),
    to = await page
      .getByRole('button', { name: 'Move Workspace pulse', exact: true })
      .boundingBox()
  await measure('widget-drag', () => drag(move, to.x - from.x, to.y - from.y))
  assert.notEqual(await order(), before)
  await page.getByRole('button', { name: 'Undo layout change' }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.mouse.move(1000, 600)
  await measure('scroll', async () => {
    for (const delta of [17, 17, -17, -17]) {
      for (let step = 0; step < 40; step++) {
        await page.mouse.wheel(0, delta)
        await page.waitForTimeout(16)
      }
      await page.waitForTimeout(300)
    }
  })
  assert.ok(samples.find(sample => sample.name === 'scroll').events.scroll > 20)
  await page.screenshot({ path: '.temp/motion-web.png' })
} catch (error) {
  await page
    .screenshot({ path: '.temp/motion-web-failure.png' })
    .catch(() => {})
  throw error
} finally {
  await browser.close()
}
