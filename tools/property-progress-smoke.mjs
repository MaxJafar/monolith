// Uses synthetic local data only. Session credentials are never printed.
import { resolveAddonIdentity } from '@monolith/configs/node'
import { expect as baseExpect, chromium, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const expect = baseExpect.configure({ timeout: 20000 })
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 }
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', e => errors.push(e.message))
let stage = 'setup'
const result = { engine, passed: false }
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  async function api(route, data, query = {}, rejected = false) {
    const response = await context.request.fetch(
      `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    if (rejected) {
      assert.equal(response.status(), 400)
      return
    }
    assert.ok(response.ok(), `${route}: ${response.status()}`)
    if (response.status() === 204) return null
    return (await response.json()).data
  }
  const workspace = await api('workspaces/create', {
    name: `Property polish ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:layers',
    description: 'Synthetic acceptance',
    enabled_modules: ['databases']
  })
  const db = (route, data, query = {}, rejected = false) =>
    api(
      'workspaceDatabases/' + route,
      data,
      { workspace_id: workspace.id, ...query },
      rejected
    )
  const projects = await db('createBase', {
    name: 'Release planning',
    description: '',
    initial_view: 'table'
  })
  const tasks = await db('createBase', {
    name: 'Related tasks',
    description: '',
    initial_view: 'table'
  })
  const ready = await db('createField', {
    base_id: projects.id,
    name: 'Ready',
    kind: 'checkbox'
  })
  const reviewed = await db('createField', {
    base_id: projects.id,
    name: 'Reviewed',
    kind: 'checkbox'
  })
  const verified = await db('createField', {
    base_id: tasks.id,
    name: 'Verified',
    kind: 'checkbox'
  })
  const relation = await db('createField', {
    base_id: projects.id,
    name: 'Tasks',
    kind: 'relation',
    target_base_id: tasks.id
  })
  const project = await db('createRecord', {
    base_id: projects.id,
    title: 'Launch workspace',
    content: '',
    values: { [ready.id]: true }
  })
  const taskA = await db('createRecord', {
    base_id: tasks.id,
    title: 'Design review',
    content: '',
    values: { [verified.id]: true }
  })
  const taskB = await db('createRecord', {
    base_id: tasks.id,
    title: 'Release checklist',
    content: '',
    values: {}
  })
  await db('setLinks', {
    field_id: relation.id,
    record_id: project.id,
    target_ids: [taskA.id, taskB.id],
    expected_ids: []
  })
  await db(
    'createField',
    {
      base_id: projects.id,
      name: 'Invalid source',
      kind: 'progress',
      progress: { checkbox_ids: [verified.id] }
    },
    {},
    true
  )
  let snapshot = await db('snapshot')
  const projectView = snapshot.views.find(v => v.base_id === projects.id)
  const taskView = snapshot.views.find(v => v.base_id === tasks.id)
  const board = await db('createView', {
    base_id: projects.id,
    name: 'Board',
    mode: 'kanban',
    group_field_id: null,
    config: { group_property: 'done' }
  })
  const pageId = randomUUID()
  await api('workspaces/savePage', {
    id: pageId,
    workspace_id: workspace.id,
    parent_id: null,
    expected_revision: 0,
    page: {
      version: 1,
      title: 'Property studio',
      icon: 'lucide:layers',
      fullWidth: true,
      revision: 0,
      updated: null,
      blocks: [
        [projects, projectView],
        [tasks, taskView]
      ].map(([base, view]) => ({
        id: randomUUID(),
        type: 'database',
        title: '',
        content: '',
        width: 'full',
        url: '',
        widget: '',
        database: {
          workspaceId: workspace.id,
          baseId: base.id,
          viewId: view.id,
          height: 0
        }
      }))
    }
  })
  await page.goto(
    `http://localhost:5173/page/${pageId}?workspace=${workspace.id}`
  )
  const surface = page.locator('.monolith-inline-database').filter({
    has: page.getByRole('heading', { name: projects.name, exact: true })
  })
  const table = page.getByRole('table', { name: projects.name, exact: true })
  // Retry the explicit offline screen if the shared development API restarts on an edit.
  async function reloadReady() {
    await page.reload()
    await expect.poll(async () => {
      const retry = page.getByRole('button', { name: 'Retry', exact: true })
      if (await retry.isVisible()) await retry.click()
      return table.isVisible()
    }, { timeout: 45000, intervals: [500, 1000, 2000] }).toBe(true)
  }
  await expect(table).toBeVisible()
  stage = 'create mixed-source progress through compact popover'
  await table
    .getByRole('button', { name: 'Add a property', exact: true })
    .click()
  let editor = page.getByRole('dialog', { name: 'Add a property', exact: true })
  await editor
    .getByRole('textbox', { name: 'Field name', exact: true })
    .fill('Completion')
  await editor.getByRole('searchbox').fill('Progress')
  await editor.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(editor.locator('.database-property-type-list')).toHaveCount(0)
  await expect(
    editor.getByRole('button', { name: 'Save', exact: true })
  ).toBeDisabled()
  await editor.getByRole('checkbox', { name: 'Ready', exact: true }).check()
  await editor.getByRole('checkbox', { name: 'Reviewed', exact: true }).check()
  await editor
    .getByRole('button', { name: 'Related pages', exact: true })
    .click()
  await page.getByRole('option', { name: 'Tasks', exact: true }).click()
  await editor
    .getByRole('checkbox', { name: 'Completed', exact: true })
    .last()
    .uncheck()
  await editor.getByRole('checkbox', { name: 'Verified', exact: true }).check()
  await editor.getByRole('button', { name: 'Bar color', exact: true }).click()
  const colorMenu = page.getByRole('dialog', { name: 'Bar color', exact: true })
  await colorMenu.getByRole('button', { name: 'Green', exact: true }).click()
  await expect(editor).toBeVisible()
  await editor.screenshot({ path: `.temp/progress-settings-${engine}.png` })
  await editor.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(editor).toHaveCount(0)
  const progress = table.getByRole('progressbar', {
    name: 'Completion',
    exact: true
  })
  await expect(progress).toHaveAttribute('aria-valuenow', '50')
  await expect(progress.locator('.database-progress-track > span')).toHaveCSS(
    'background-color',
    'rgb(76, 170, 120)'
  )
  stage = 'live local and related updates'
  await table.getByRole('checkbox', { name: 'Reviewed', exact: true }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '75')
  const taskTable = page.getByRole('table', { name: tasks.name, exact: true })
  await taskTable
    .getByRole('row')
    .filter({ hasText: 'Release checklist' })
    .getByRole('checkbox', { name: 'Verified', exact: true })
    .click()
  await expect(progress).toHaveAttribute('aria-valuenow', '100')
  await reloadReady()
  await expect(progress).toHaveAttribute('aria-valuenow', '100')
  await expect(progress.locator('.database-progress-track > span')).toHaveCSS(
    'background-color',
    'rgb(76, 170, 120)'
  )
  stage = 'existing property, settings, theme and mobile bounds'
  await table.getByRole('button', { name: 'Completion', exact: true }).click()
  editor = page
    .locator('.database-floating-panel')
    .filter({ has: page.locator('.database-progress-settings') })
  await expect(
    editor.getByRole('checkbox', { name: 'Ready', exact: true })
  ).toBeChecked()
  await editor
    .getByRole('switch', { name: 'Show percentage', exact: true })
    .uncheck()
  await editor.getByRole('button', { name: 'Bar color', exact: true }).click()
  await colorMenu.getByRole('button', { name: 'Default', exact: true }).click()
  await editor.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(progress.locator('.database-progress-number')).toHaveCount(0)
  // Color follows the same customization token, not a hardcoded progress color.
  const previousColor = await progress.evaluate(element => {
    let scope = element
    while (
      !scope.style.getPropertyValue('--selection-color') &&
      scope.parentElement
    )
      scope = scope.parentElement
    const previous = scope.style.getPropertyValue('--selection-color')
    scope.style.setProperty('--selection-color', '#ad5cca')
    return previous
  })
  await expect(progress.locator('.database-progress-track > span')).toHaveCSS(
    'background-color',
    'rgb(173, 92, 202)'
  )
  await progress.evaluate((element, previous) => {
    let scope = element
    while (
      !scope.style.getPropertyValue('--selection-color') &&
      scope.parentElement
    )
      scope = scope.parentElement
    if (previous) scope.style.setProperty('--selection-color', previous)
    else scope.style.removeProperty('--selection-color')
  }, previousColor)
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true })
    await settings.getByRole('button', { name: 'Theme', exact: true }).click()
    const response = page.waitForResponse(r =>
      r.url().includes('/personalization/updatePersonalization')
    )
    await page.getByRole('option', { name: theme, exact: true }).click()
    assert.ok((await response).ok())
    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    await table.getByRole('button', { name: 'Completion', exact: true }).click()
    await expect(editor).toBeVisible()
    await expect(
      editor.getByRole('textbox', { name: 'Field name', exact: true })
    ).toBeFocused()
    await editor.screenshot({
      path: `.temp/progress-${theme.toLowerCase()}-${engine}.png`
    })
    await page.keyboard.press('Escape')
    await expect(editor).toHaveCount(0)
  }
  stage = 'custom progress color and nested popover focus'
  await table.getByRole('button', { name: 'Completion', exact: true }).click()
  await editor.getByRole('button', { name: 'Bar color', exact: true }).click()
  await colorMenu
    .getByRole('textbox', { name: 'Custom color HEX', exact: true })
    .fill('#c47de8')
  await colorMenu
    .getByRole('textbox', { name: 'Custom color HEX', exact: true })
    .press('Enter')
  await editor.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await reloadReady()
  await expect(progress.locator('.database-progress-track > span')).toHaveCSS(
    'background-color',
    'rgb(196, 125, 232)'
  )
  await table.getByRole('button', { name: 'Completion', exact: true }).click()
  await editor.getByRole('button', { name: 'Bar color', exact: true }).click()
  await colorMenu.screenshot({ path: `.temp/progress-color-${engine}.png` })
  await page.keyboard.press('Escape')
  await expect(colorMenu).toHaveCount(0)
  await expect(editor).toBeVisible()
  await expect(
    editor.getByRole('button', { name: 'Bar color', exact: true })
  ).toBeFocused()
  await editor
    .getByRole('button', { name: 'Cancel', exact: true })
    .last()
    .click()
  await surface
    .getByRole('button', { name: 'View settings', exact: true })
    .click()
  let viewEditor = page.getByRole('dialog', {
    name: 'View settings',
    exact: true
  })
  await viewEditor.getByRole('button', { name: /^Layout/ }).click()
  await expect(
    viewEditor.getByRole('switch', { name: 'Wrap cell content' })
  ).toBeVisible()
  await viewEditor.screenshot({ path: `.temp/table-settings-${engine}.png` })
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await table.getByRole('button', { name: 'Completion', exact: true }).click()
  const bounds = await editor.boundingBox()
  assert.ok(
    bounds &&
      bounds.x >= 0 &&
      bounds.x + bounds.width <= 390 &&
      bounds.y + bounds.height <= 844
  )
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 1000 })
  stage = 'board and side-page progress rendering'
  await surface.getByRole('link', { name: 'Board', exact: true }).click()
  const card = surface.locator(`[data-record-id="${project.id}"]`)
  await expect(
    card.getByRole('progressbar', { name: 'Completion' })
  ).toHaveAttribute('aria-valuenow', '100')
  await card.getByRole('checkbox', { name: 'Ready', exact: true }).click()
  await expect(
    card.getByRole('progressbar', { name: 'Completion' })
  ).toHaveAttribute('aria-valuenow', '75')
  await card
    .getByRole('button', { name: 'Open Launch workspace', exact: true })
    .click()
  const side = page.locator('.database-record-surface')
  await expect(
    side.getByRole('progressbar', { name: 'Completion' })
  ).toHaveAttribute('aria-valuenow', '75')
  await side.getByRole('checkbox', { name: 'Ready', exact: true }).click()
  await expect(
    side.getByRole('progressbar', { name: 'Completion' })
  ).toHaveAttribute('aria-valuenow', '100')
  await expect(side.locator('.database-progress-track > span')).toHaveCSS(
    'background-color',
    'rgb(196, 125, 232)'
  )
  stage = 'fluid property expansion and reduced motion'
  async function toggleAndSample(button, axis = 'height') {
    return button.evaluate(async (control, dimension) => {
      const region = document.getElementById(
        control.getAttribute('aria-controls')
      )
      const before = region.getBoundingClientRect()[dimension]
      control.click()
      const heights = []
      const start = performance.now()
      await new Promise(resolve => {
        function sample() {
          heights.push(region.getBoundingClientRect()[dimension])
          if (performance.now() - start >= 340) resolve()
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return {
        before,
        heights,
        after: region.getBoundingClientRect()[dimension]
      }
    }, axis)
  }
  const system = await toggleAndSample(
    side.getByRole('button', { name: 'Show system properties', exact: true })
  )
  assert.ok(system.after > system.before)
  assert.ok(
    system.heights.some(h => h > system.before + 1 && h < system.after - 1),
    'system properties must animate between heights'
  )
  const collapse = await toggleAndSample(
    side.getByRole('button', { name: /^Hide \d+ properties$/ })
  )
  assert.ok(collapse.before > 0 && collapse.after === 0)
  assert.ok(
    collapse.heights.some(h => h > 1 && h < collapse.before - 1),
    'property collapse must have intermediate frames'
  )
  await side.getByRole('button', { name: /^Show \d+ properties$/ }).click()
  await expect(
    side.getByRole('progressbar', { name: 'Completion' })
  ).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await toggleAndSample(
    side.getByRole('button', { name: 'Hide system properties', exact: true })
  )
  assert.equal(reduced.after, 0)
  assert.ok(
    reduced.heights.every(h => h === 0),
    'reduced motion should settle immediately'
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await side.locator('[data-close-record]').click()
  await expect(
    card.getByRole('progressbar', { name: 'Completion' })
  ).toHaveAttribute('aria-valuenow', '100')
  snapshot = await db('snapshot')
  const savedProgress = snapshot.fields.find(
    f => f.base_id === projects.id && f.kind === 'progress'
  )
  assert.equal(savedProgress.config.progress.color, '#c47de8')
  assert.deepEqual(savedProgress.config.progress.checkbox_ids, [
    ready.id,
    reviewed.id
  ])
  assert.equal(
    snapshot.records.find(r => r.id === project.id).values[savedProgress.id],
    100
  )
  stage = 'workspace and standard editors as anchored popovers'
  const resizeBounds = await page
    .getByRole('separator', { name: 'Resize sidebar', exact: true })
    .boundingBox()
  assert.ok(
    resizeBounds && resizeBounds.width <= 8,
    'resize target must not cover sidebar controls'
  )
  const sidebarToggle = page
    .locator('button[aria-controls="workspace-navigation"]:visible')
    .first()
  const sidebarClosed = await toggleAndSample(sidebarToggle, 'width')
  assert.ok(sidebarClosed.before > 0 && sidebarClosed.after === 0)
  assert.ok(
    sidebarClosed.heights.some(w => w > 1 && w < sidebarClosed.before - 1)
  )
  await sidebarToggle.click()
  await expect(page.locator('.zillion-main-sidebar')).toHaveCSS(
    'width',
    `${sidebarClosed.before}px`
  )
  const workspaceTrigger = page.getByRole('button', {
    name: 'New workspace',
    exact: true
  })
  const sidebarBefore = await page
    .locator('.zillion-main-sidebar')
    .boundingBox()
  await workspaceTrigger.click()
  const workspaceEditor = page.getByRole('dialog', {
    name: 'New workspace',
    exact: true
  })
  await expect(workspaceEditor).toBeVisible()
  await expect(workspaceEditor.getByRole('textbox')).toBeFocused()
  assert.deepEqual(
    await page.locator('.zillion-main-sidebar').boundingBox(),
    sidebarBefore
  )
  await workspaceEditor.screenshot({
    path: `.temp/workspace-popover-${engine}.png`
  })
  await page.keyboard.press('Escape')
  await expect(workspaceEditor).toHaveCount(0)
  await expect(workspaceTrigger).toBeFocused()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const accountSettings = page.getByRole('dialog', {
    name: 'Settings',
    exact: true
  })
  await accountSettings
    .getByRole('button', { name: 'My account', exact: true })
    .click()
  const editName = accountSettings.getByRole('button', {
    name: /Edit Display Name/i
  })
  await editName.click()
  const form = page.locator('.monolith-form-dialog')
  await expect(form).toBeVisible()
  await expect(form.getByRole('textbox')).toBeFocused()
  await expect(
    page.locator('[data-modal-overlay][data-contextual="true"]')
  ).toHaveCSS('backdrop-filter', 'none')
  await form.getByRole('textbox').fill('Unsaved profile draft')
  await page.mouse.click(10, 10)
  await expect(form.getByRole('textbox')).toHaveValue('Unsaved profile draft')
  await page.setViewportSize({ width: 390, height: 844 })
  const formBounds = await form.boundingBox()
  assert.ok(
    formBounds && formBounds.x >= 0 && formBounds.x + formBounds.width <= 390
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  await form.screenshot({ path: `.temp/profile-popover-${engine}.png` })
  await form.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(form).toHaveCount(0)
  await expect(editName).toBeFocused()
  await accountSettings
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  assert.deepEqual(errors, [])
  Object.assign(result, {
    passed: true,
    workspace: workspace.id,
    page: pageId,
    checks: [
      'mixed sources',
      'local and related live updates',
      'invalid source rejected',
      'reload persistence',
      'customization color',
      'preset/custom colors, reset and persistence',
      'animated properties and reduced motion',
      'anchored forms, mobile bounds, draft preservation and focus return',
      'percentage toggle',
      'light/dark',
      'mobile bounds',
      'compact view settings',
      'board and side page'
    ]
  })
} catch (error) {
  Object.assign(result, { stage, error: String(error) })
  await page
    .screenshot({
      path: `.temp/property-progress-${engine}-failure.png`,
      fullPage: true
    })
    .catch(() => {})
  throw error
} finally {
  writeFileSync(
    `.temp/property-progress-${engine}-result.json`,
    JSON.stringify(result, null, 2)
  )
  await browser.close()
}
console.log(JSON.stringify(result))
