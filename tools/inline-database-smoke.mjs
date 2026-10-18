import { resolveAddonIdentity } from '@monolith/configs/node'
// Acceptance checks against synthetic local accounts only; credentials are never logged.
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const legacy = process.argv.includes('--legacy')
const fixture = JSON.parse(
  readFileSync(
    legacy
      ? '.temp/monolith-review-fixture.json'
      : '.temp/desktop-fixture.json',
    'utf8'
  )
)
const origin = 'http://localhost:5173',
  api = 'http://localhost:3636'
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
const browser = await chromium.launch({ headless: true })
let page
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 }
  })
  const login = await context.request.post(`${api}/auth/login`, {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200, 'Synthetic login failed')
  const token = (await login.json()).data.accessToken
  async function request(route, data, query = {}) {
    const url = `${api}/modules/${remote}/${route}?${new URLSearchParams(query)}`
    const result = await context.request.fetch(url, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      data
    })
    assert.ok(
      result.ok(),
      `${route}: HTTP ${result.status()} ${await result.text()}`
    )
    return (await result.json()).data
  }
  const spaces = await request('workspaces/list')
  const workspace =
    fixture.workspace ?? spaces.find(space => space.is_default)?.id
  assert.ok(workspace)
  const scope = { workspace_id: workspace }
  const existingBases = new Set(
    (await request('workspaceDatabases/snapshot', undefined, scope)).bases.map(
      base => base.id
    )
  )
  const id = randomUUID()
  const title = `Inline database studio${legacy ? ' · classic' : ''}`
  await request('workspaces/savePage', {
    id,
    workspace_id: workspace,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title,
      icon: 'lucide:layers',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        {
          id: randomUUID(),
          type: 'document',
          title: '',
          content:
            'One collection. Every perspective.\nShape your work with connected views, then make the page your own.',
          width: 'full',
          url: '',
          widget: ''
        }
      ]
    }
  })
  page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const url = `${origin}/page/${id}?workspace=${workspace}`
  await page.goto(url)
  let pickerCount = 0
  async function openPicker() {
    if (!legacy && pickerCount++ === 0) {
      const paragraph = page.locator('editor-host affine-paragraph [contenteditable="true"]').first()
      await paragraph.click()
      await page.keyboard.press('Home')
      await page.keyboard.type('/inline data', { delay: 45 })
      await page.getByRole('option', { name: 'Inline database', exact: true }).click()
    } else await page
      .getByRole('button', {
        name: legacy ? 'Add block' : 'Inline database',
        exact: true
      })
      .click()
    await page
      .getByRole('region', { name: 'Inline database', exact: true })
      .waitFor()
    return page.getByRole('region', { name: 'Inline database', exact: true })
  }
  const picker = await openPicker()
  const name = 'Product studio'
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill(name)
  for (const label of ['Table', 'Board', 'Calendar', 'Gallery', 'List'])
    await expect(
      picker.getByRole('button', { name: label, exact: true })
    ).toBeVisible()
  await picker.getByRole('button', { name: 'Gallery', exact: true }).click()
  await picker
    .getByRole('button', { name: 'Create database', exact: true })
    .click()
  const frames = page.locator('.monolith-inline-database'),
    first = frames.first()
  await expect(first.getByRole('heading', { name, exact: true })).toBeVisible()
  await expect(
    page.getByText('Change database view', { exact: true })
  ).toHaveCount(0)
  if (!legacy) {
    const textColors = await page
      .locator('editor-host')
      .first()
      .evaluate(host => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--text-primary)'
        host.append(probe)
        const expected = getComputedStyle(probe).color
        probe.remove()
        return {
          expected,
          actual: getComputedStyle(host.querySelector('affine-paragraph')).color
        }
      })
    assert.equal(
      textColors.actual,
      textColors.expected,
      'Editor text follows the active theme'
    )
    const block = first.locator('xpath=ancestor::*[@data-block-id][1]')
    await block.hover()
    await block.locator(':scope > .monolith-document-grip').click()
    await expect(block).toHaveAttribute('data-monolith-selected', 'true')
    await expect(
      page.getByRole('menuitem', { name: 'Duplicate', exact: true })
    ).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: '.temp/refinement-block-menu.png',
      animations: 'disabled'
    })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('menuitem', { name: 'Duplicate', exact: true })
    ).toHaveCount(0)
  }
  const createButton = first.getByRole('button', {
    name: 'New record',
    exact: true
  })
  await expect(createButton.locator('svg')).toBeVisible()
  assert.ok(
    await createButton.evaluate(
      element =>
        getComputedStyle(element.querySelector('svg')).color ===
        getComputedStyle(element).color
    ),
    'Primary action icons must retain the button foreground contrast'
  )
  let snapshot = await request('workspaceDatabases/snapshot', undefined, scope)
  const base = snapshot.bases.find(
    base => base.name === name && !existingBases.has(base.id)
  )
  assert.ok(base)
  assert.equal(
    snapshot.views.find(view => view.base_id === base.id).mode,
    'gallery'
  )
  await first.getByRole('button', { name: 'New record', exact: true }).click()
  const recordSurface = page.locator('.database-record-surface')
  await recordSurface
    .getByRole('textbox', { name: /^Title/ })
    .fill('Design the next chapter')
  await recordSurface
    .getByRole('button', { name: 'Save page', exact: true })
    .click()
  await recordSurface
    .getByRole('button', { name: 'Back to database', exact: true })
    .click()
  await expect(
    first.getByRole('link', { name: 'Design the next chapter', exact: true })
  ).toBeVisible()
  assert.equal(
    page.url(),
    url,
    'Inline record editing must preserve the page URL'
  )
  const today = new Date().toISOString().slice(0, 10)
  for (const [index, title] of [
    'Prototype with purpose',
    'Collect the good ideas',
    'Make room for focus',
    'Build something meaningful',
    'Review and refine'
  ].entries()) {
    await request(
      'workspaceDatabases/createRecord',
      {
        base_id: base.id,
        title,
        content: '',
        values: {},
        item_type: 'task',
        done: index === 3,
        date: `${today}T12:00:00Z`
      },
      scope
    )
  }
  for (const [mode, viewName] of [
    ['table', 'Table'],
    ['kanban', 'Board'],
    ['calendar', 'Calendar'],
    ['list', 'List']
  ]) {
    await request(
      'workspaceDatabases/createView',
      {
        base_id: base.id,
        name: viewName,
        mode,
        group_field_id: null,
        config:
          mode === 'kanban'
            ? { group_property: 'done' }
            : mode === 'calendar'
              ? { date_field_id: 'date' }
              : {}
      },
      scope
    )
  }
  async function savePage() {
    await page.evaluate(
      () =>
        new Promise(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
    )
    if (legacy)
      await expect(
        page.getByText('All changes saved', { exact: true }).first()
      ).toBeAttached({ timeout: 15000 })
    else
      await expect(
        page.getByText('Saved to server', { exact: true }).first()
      ).toBeAttached({ timeout: 15000 })
  }
  await savePage()
  await page.reload()
  for (const [label, selector] of [
    ['Table', '.zillion-database-table'],
    ['Board', '.monolith-board'],
    ['Calendar', '[aria-label="Calendar"]'],
    ['List', '.monolith-database-list'],
    ['Gallery', '.monolith-database-gallery']
  ]) {
    await first.getByRole('link', { name: label, exact: true }).click()
    if (label !== 'Calendar')
      await expect(first.locator(selector)).toBeVisible()
    else
      await expect(
        first.getByRole('button', { name: 'Next period', exact: true })
      ).toBeVisible()
    assert.equal(page.url(), url, `Inline ${label} must not navigate`)
  }
  await first.getByRole('link', { name: 'Board', exact: true }).click()
  const completed = first.locator(
    '.monolith-board-column[aria-label="Checked"]'
  )
  await first
    .getByRole('article')
    .filter({ hasText: 'Prototype with purpose' })
    .dragTo(completed)
  await expect(
    completed.getByRole('link', { name: 'Prototype with purpose', exact: true })
  ).toBeVisible()
  await expect(page.locator('.monolith-native-drag-preview')).toHaveCount(0)
  await first.getByRole('link', { name: 'Gallery', exact: true }).click()
  await first
    .getByRole('link', { name: 'Design the next chapter', exact: true })
    .click()
  await recordSurface
    .getByRole('textbox', { name: /^Title/ })
    .fill('Design a calmer workspace')
  await recordSurface
    .getByRole('button', { name: 'Save page', exact: true })
    .click()
  await recordSurface
    .getByRole('button', { name: 'Back to database', exact: true })
    .click()
  await expect(
    first.getByRole('link', { name: 'Design a calmer workspace', exact: true })
  ).toBeVisible()
  const handle = first.getByRole('separator', {
    name: 'Resize database',
    exact: true
  })
  await handle.press('ArrowUp')
  for (const amount of [55, -20]) {
    await handle.scrollIntoViewIfNeeded()
    const box = await handle.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2 + amount,
      { steps: 10 }
    )
    await page.mouse.up()
  }
  const height = await first
    .locator('.monolith-inline-viewport')
    .getAttribute('style')
  await savePage()
  await page.reload()
  await expect(first.locator('.monolith-inline-viewport')).toHaveAttribute(
    'style',
    height
  )
  await expect(
    first.getByRole('link', { name: 'Gallery', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  const secondPicker = await openPicker()
  const existing = secondPicker
    .locator('.monolith-existing-database')
    .filter({ hasText: name })
    .last()
  await existing
    .getByRole('button', { name: `View for ${name}`, exact: true })
    .click()
  await page.getByRole('option', { name: 'Calendar', exact: true }).click()
  await existing.getByRole('button', { name: 'Insert', exact: true }).click()
  await expect(frames).toHaveCount(2)
  const second = frames.nth(1)
  await first.getByRole('link', { name: 'Calendar', exact: true }).click()
  const secondBefore = await second.innerText()
  await first.getByRole('button', { name: 'Next period', exact: true }).click()
  assert.equal(
    await second.innerText(),
    secondBefore,
    'Calendar navigation must be isolated per embed'
  )
  assert.equal(page.url(), url)
  await first.getByRole('link', { name: 'Gallery', exact: true }).click()
  await second.getByRole('link', { name: 'Table', exact: true }).click()
  await savePage()
  await page.reload()
  await expect(
    first.getByRole('link', { name: 'Gallery', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    second.getByRole('link', { name: 'Table', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await first.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `.temp/inline-database-${legacy ? 'legacy' : 'canonical'}.png`,
    animations: 'disabled'
  })
  if (!legacy) {
    await page.getByRole('button', { name: 'Page settings and actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Full width', exact: true }).click()
    await page.keyboard.press('Escape')
  }
  if (!legacy) for (const width of [3440, 5120]) {
    await page.setViewportSize({ width, height: 1100 })
    await page.waitForTimeout(200)
    assert.ok((await first.boundingBox()).width > width * 0.75, `Full width uses the ${width}px viewport`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `No overflow at ${width}px`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(first.locator('.monolith-database-gallery')).toBeVisible()
  assert.ok(
    (await first.locator('.monolith-view-tabs').boundingBox()).width >= 220,
    'Saved view tabs must retain a usable scrolling area on mobile'
  )
  if (!legacy)
    assert.ok(
      (await page
        .locator('.monolith-document-title')
        .evaluate(element => parseFloat(getComputedStyle(element).fontSize))) >=
        26,
      'Page heading must remain readable on mobile'
    )
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
    'Page must fit mobile width'
  )
  await page.screenshot({
    path: `.temp/inline-database-${legacy ? 'legacy' : 'canonical'}-mobile.png`,
    animations: 'disabled'
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await first.getByRole('link', { name: 'List', exact: true }).click()
  assert.equal(
    await first
      .locator('.monolith-database-view-enter')
      .evaluate(element => getComputedStyle(element).animationName),
    'none'
  )
  await handle.press('Home')
  await expect(first.locator('.monolith-inline-viewport')).not.toHaveAttribute(
    'style',
    /height:/
  )
  await savePage()
  await first.getByRole('link', { name: 'Gallery', exact: true }).click()
  await savePage()
  assert.deepEqual(errors, [], 'No uncaught page errors')
  writeFileSync(
    `.temp/inline-database-${legacy ? 'legacy' : 'canonical'}-review.json`,
    JSON.stringify({ page: id, workspace, base: base.id, url })
  )
  console.log(
    `PASS ${legacy ? 'Classic page' : 'BlockSuite'}: inline creation, five views, record edits, isolated calendars, repeated resize, reload persistence, mobile width and reduced motion.`
  )
} catch (error) {
  if (page) {
    await page
      .screenshot({ path: '.temp/inline-failure.png', animations: 'disabled' })
      .catch(() => {})
    writeFileSync(
      '.temp/inline-failure.txt',
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    )
  }
  throw error
} finally {
  await browser.close()
}
