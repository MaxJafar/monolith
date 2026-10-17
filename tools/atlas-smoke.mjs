import { resolveAddonIdentity } from '@monolith/configs/node'
// Local acceptance workflow using the existing synthetic preview account.
// Temporary semantic links are removed in finally; source pages are never deleted.
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(
  readFileSync('.temp/monolith-review-fixture.json', 'utf8')
)
const api = 'http://localhost:3636',
  origin = 'http://localhost:5173'
const remote = resolveAddonIdentity({ name: '@monolith/atlas' }).remoteId
const browser = await chromium.launch({ headless: true })
const errors = [],
  label = `Atlas acceptance ${randomUUID()}`
let context, token, workspace, page, originalDark
async function savedLinksOnly() {
  await expect(page.locator('.atlas-map-footer')).toContainText(
    'sources embedded',
    { timeout: 15000 }
  )
  for (const name of ['Tags', 'Topics', 'Context']) {
    const layer = page.getByRole('button', { name, exact: true })
    if ((await layer.getAttribute('aria-pressed')) === 'true')
      await layer.click()
  }
}
async function request(route, body, query = {}) {
  const result = await context.request.fetch(
    `${api}/modules/${remote}/${route}?${new URLSearchParams(query)}`,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
      data: body
    }
  )
  assert.ok(result.ok(), `${route}: ${result.status()} ${await result.text()}`)
  const text = await result.text()
  return text ? JSON.parse(text).data : undefined
}
try {
  context = await browser.newContext({
    viewport: { width: 1600, height: 1050 }
  })
  // The local API watcher may be restarting after a source/build change.
  await expect
    .poll(
      async () => {
        try {
          return (
            (
              await context.request.get(api + '/modules', { timeout: 2000 })
            ).status() < 500
          )
        } catch {
          return false
        }
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .toBe(true)
  const login = await context.request.post(api + '/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  token = (await login.json()).data.accessToken
  workspace = (await request('workspaces')).find(
    space => space.id === '39c03ba9-05fa-4d03-8f63-834c5aa6d17e'
  ).id
  const scope = { workspace_id: workspace }
  const initial = await request('snapshot', undefined, scope)
  const source = initial.nodes.find(node => node.title === 'Workspace guide')
  const target = initial.nodes.find(
    node => node.title === 'Inline database studio · classic'
  )
  assert.ok(source && target)
  assert.ok(
    !initial.edges.some(
      edge =>
        edge.kind === 'related' &&
        [edge.source, edge.target].includes(source.key) &&
        [edge.source, edge.target].includes(target.key)
    ),
    'Choose an unconnected fixture pair'
  )
  page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/atlas?workspace=${workspace}`)
  await expect(page.locator('.atlas h1')).toHaveText('Atlas')
  await savedLinksOnly()
  await expect(page.locator('.atlas .zillion-graph-node')).toHaveCount(
    initial.nodes.length
  )
  await expect(
    page.getByRole('textbox', { name: 'Page title', exact: true })
  ).toHaveCount(0)
  originalDark = await page
    .locator('html')
    .evaluate(element => element.classList.contains('dark'))
  const explorer = page.locator('.atlas-explorer')
  await explorer.getByRole('button', { name: new RegExp(source.title) }).click()
  await expect(page.locator('.atlas-inspector h2')).toHaveText(source.title)
  await expect(page.locator('.atlas-preview-text')).not.toHaveText('')
  await page.getByRole('button', { name: 'Neighborhood', exact: true }).click()
  await expect(page.locator('.zillion-graph-node')).toHaveCount(2)
  await page.getByLabel('Depth', { exact: true }).selectOption('2')
  await page.getByRole('button', { name: 'Mind map', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Mind map', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Whole workspace', exact: true })
    .click()
  await page.getByRole('button', { name: 'Graph', exact: true }).click()
  await explorer
    .getByRole('searchbox', { name: 'Find a page…' })
    .fill('no-such-atlas-fixture')
  await expect(
    page.getByText('No matching pages.', { exact: true })
  ).toBeVisible()
  await explorer
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click()
  await expect(page.locator('.zillion-graph-node')).toHaveCount(
    initial.nodes.length
  )
  await page
    .getByRole('button', { name: 'Connect a page', exact: true })
    .click()
  await page
    .getByLabel('Page to connect', { exact: true })
    .selectOption(target.key)
  await page.getByLabel('Relationship label', { exact: true }).fill(label)
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(
    page.locator('.atlas-inspector').getByText(label, { exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.locator('.atlas-inspector').getByText(label, { exact: true })
  ).toBeVisible()
  await page
    .getByRole('button', {
      name: 'Remove connection to ' + target.title,
      exact: true
    })
    .click()
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(
    page.locator('.atlas-inspector').getByText(label, { exact: true })
  ).toHaveCount(0)
  const after = await request('snapshot', undefined, scope)
  assert.deepEqual(
    after.nodes.map(node => node.key).sort(),
    initial.nodes.map(node => node.key).sort()
  )
  await page
    .getByRole('button', { name: 'Pause graph motion', exact: true })
    .click()
  const graphNode = page.locator(`[data-node-key="${source.key}"]`)
  const transformBefore = await graphNode.getAttribute('transform')
  const box = await graphNode.locator('.zillion-graph-dot').boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    box.x + box.width / 2 + 65,
    box.y + box.height / 2 + 40,
    { steps: 12 }
  )
  await page.mouse.up()
  assert.notEqual(
    await graphNode.getAttribute('transform'),
    transformBefore,
    'Dragging a paused graph must move the node'
  )
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Fit map', exact: true }).click()
  await graphNode.press('Enter')
  await expect(graphNode).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Open page', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/page/${source.id}`))
  await page.goBack()
  await expect(page.locator('.atlas h1')).toHaveText('Atlas')
  await page
    .getByRole('button', { name: 'Close page details', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: originalDark ? 'Switch to light theme' : 'Switch to dark theme',
      exact: true
    })
    .click()
  await expect(page.locator('html')).toHaveClass(
    originalDark ? /^(?!.*\bdark\b)/ : /dark/
  )
  await page.screenshot({
    path: '.temp/atlas-dark.png',
    animations: 'disabled'
  })
  await page
    .getByRole('button', {
      name: originalDark ? 'Switch to dark theme' : 'Switch to light theme',
      exact: true
    })
    .click()
  await page.screenshot({
    path: '.temp/atlas-desktop.png',
    animations: 'disabled'
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole('button', { name: 'Toggle explorer', exact: true })
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Toggle explorer', exact: true })
    .click()
  await expect(
    explorer.getByRole('searchbox', { name: 'Find a page…' })
  ).toBeVisible()
  await explorer
    .getByRole('searchbox', { name: 'Find a page…' })
    .fill('Workspace guide')
  await expect(page.locator('.zillion-graph-node')).toHaveCount(1)
  await explorer.getByRole('button', { name: /Workspace guide/ }).click()
  await expect(page.locator('.atlas-inspector h2')).toHaveText(source.title)
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    ),
    'Mobile page must not overflow horizontally'
  )
  await page.screenshot({
    path: '.temp/atlas-mobile.png',
    fullPage: true,
    animations: 'disabled'
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.reload()
  await savedLinksOnly()
  await expect(page.locator('.zillion-graph-node')).toHaveCount(
    initial.nodes.length
  )
  const reducedNode = page.locator(`[data-node-key="${source.key}"]`)
  const stable = await reducedNode.getAttribute('transform')
  await page.locator('.atlas-settings summary').click()
  await expect(
    page.getByLabel('Show page titles', { exact: true })
  ).toBeVisible()
  assert.equal(
    await reducedNode.getAttribute('transform'),
    stable,
    'Reduced motion must leave the layout settled'
  )
  assert.deepEqual(errors, [])
  console.log(
    'Atlas acceptance passed: routing, graph and mind map, filters, previews, persisted connections, safe unlink, node dragging, keyboard, source navigation, dark/light, mobile, reduced motion; no browser errors.'
  )
} catch (error) {
  console.error(error)
  if (page)
    await page
      .screenshot({ path: '.temp/atlas-failure.png', fullPage: true })
      .catch(() => {})
  throw error
} finally {
  if (token && workspace) {
    const state = await request('snapshot', undefined, {
      workspace_id: workspace
    })
    for (const edge of state.edges.filter(
      edge => edge.kind === 'related' && edge.label === label
    ))
      await request('unrelate', {}, { workspace_id: workspace, id: edge.id })
  }
  if (page && originalDark !== undefined) {
    const currentDark = await page
      .locator('html')
      .evaluate(element => element.classList.contains('dark'))
      .catch(() => originalDark)
    if (currentDark !== originalDark)
      await page
        .getByRole('button', {
          name: originalDark ? 'Switch to dark theme' : 'Switch to light theme',
          exact: true
        })
        .click()
        .catch(() => {})
  }
  await browser.close()
}
