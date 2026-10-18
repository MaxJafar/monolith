import { resolveAddonIdentity } from '@monolith/configs/node'
// Local acceptance with an isolated, disposable database in the synthetic review account.
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(
  readFileSync('.temp/monolith-review-fixture.json', 'utf8')
)
const api = 'http://localhost:3636',
  origin = 'http://localhost:5173'
const workspace = '39c03ba9-05fa-4d03-8f63-834c5aa6d17e'
const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1600, height: 1080 },
  reducedMotion: 'reduce'
})
let token, base, page, originalDark
async function request(route, body, query = {}) {
  const result = await context.request.fetch(
    `${api}${route}?${new URLSearchParams(query)}`,
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
async function database(route, body, extra = {}) {
  return request(`/modules/${remote}/workspaceDatabases/${route}`, body, {
    workspace_id: workspace,
    ...extra
  })
}
try {
  // The development API can restart after a source build or formatting pass.
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
  base = await database('createBase', {
    name: 'Atlas design lab',
    description: 'Disposable synthetic knowledge-map verification.'
  })
  const records = []
  const examples = [
    [
      'Design systems',
      'project',
      'A design system connects interaction design, accessibility and reusable components.',
      ['design', 'accessibility']
    ],
    [
      'Keyboard navigation research',
      'note',
      'Interaction design research: keyboard navigation and accessible components help everyone. #accessibility',
      ['research', 'design']
    ],
    [
      'Build accessible components',
      'task',
      'Implement keyboard navigation for reusable components in the design system.',
      ['design', 'accessibility']
    ],
    [
      'Motion principles',
      'note',
      'Interaction design should use responsive motion while respecting reduced motion and accessibility.',
      ['design', 'motion']
    ],
    [
      'Polish spring interactions',
      'task',
      'Responsive motion and spring interactions make reusable components feel fluid.',
      ['motion', 'design']
    ],
    [
      'Knowledge discovery',
      'project',
      'Knowledge discovery connects semantic retrieval, contextual search and research.',
      ['knowledge', 'research']
    ],
    [
      'Semantic retrieval notes',
      'note',
      'Semantic retrieval and contextual search reveal research connections in knowledge discovery.',
      ['knowledge', 'research']
    ],
    [
      'Connect the search index',
      'task',
      'Integrate contextual search and semantic retrieval with knowledge discovery.',
      ['knowledge', 'engineering']
    ],
    [
      'Design review',
      'event',
      'Review keyboard navigation, accessible components and motion principles.',
      ['design', 'accessibility']
    ],
    [
      'A shared second brain',
      'page',
      'Knowledge discovery and interaction design connect research across disciplines.',
      ['idea', 'knowledge', 'design']
    ]
  ]
  for (const [title, item_type, content, tags] of examples)
    records.push(
      await database('createRecord', {
        base_id: base.id,
        title,
        item_type,
        content,
        tags
      })
    )
  const state = await request('/search/map', undefined, {
    workspace_id: workspace
  })
  assert.ok(
    state.nodes.some(node => node.kind === 'tag' && node.title === 'design')
  )
  assert.ok(state.nodes.some(node => node.kind === 'topic'))
  const recordKeys = new Set(records.map(record => `record:${record.id}`))
  const connection = state.edges.find(
    edge =>
      edge.kind === 'context' &&
      recordKeys.has(edge.source) &&
      recordKeys.has(edge.target)
  )
  assert.ok(connection, 'Context should connect the synthetic source passages')
  page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${origin}/atlas?workspace=${workspace}`)
  await expect(page.locator('.atlas h1')).toHaveText('Atlas')
  await expect(
    page.locator('.zillion-graph-node[data-kind="tag"]')
  ).not.toHaveCount(0)
  const fills = await page
    .locator('.zillion-graph-node')
    .evaluateAll(nodes =>
      nodes.map(
        node => getComputedStyle(node.querySelector('.zillion-graph-dot')).fill
      )
    )
  assert.ok(
    new Set(fills).size > 10,
    'Nodes should have distinct stable colors'
  )
  const strokes = await page
    .locator('.zillion-graph-edge')
    .evaluateAll(edges => edges.map(edge => getComputedStyle(edge).stroke))
  assert.ok(
    new Set(strokes).size > 10,
    'Edges should have distinct stable colors'
  )
  const edge = page.locator(`[data-edge-id="${connection.id}"]`)
  await edge.press('Enter')
  await expect(page.locator('.atlas-link-evidence')).toContainText(
    'Why these connect'
  )
  await expect(page.locator('.atlas-link-evidence')).toContainText(
    'inferred connection'
  )
  await page
    .getByRole('button', { name: 'Save connection', exact: true })
    .click()
  await expect(
    page
      .locator('.atlas-inspector')
      .getByText('Related context', { exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(
    page
      .locator('.atlas-inspector')
      .getByText('Related context', { exact: true })
  ).toBeVisible()
  // Original pages remain editable; synthetic concept nodes have no write action.
  const tag = state.nodes.find(
    node => node.kind === 'tag' && node.title === 'design'
  )
  await page.locator(`[data-node-key="${tag.key}"]`).press('Enter')
  await expect(page.locator('.atlas-inspector h2')).toHaveText('design')
  await expect(
    page.getByRole('button', { name: 'Connect a page', exact: true })
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Explore neighborhood', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Neighborhood', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Whole workspace', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Close page details', exact: true })
    .click()
  await page.getByRole('button', { name: 'Tags', exact: true }).click()
  await expect(
    page.locator('.zillion-graph-node[data-kind="tag"]')
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Tags', exact: true }).click()
  await page.getByLabel('Color', { exact: true }).selectOption('type')
  await page
    .getByRole('button', { name: 'Search knowledge', exact: true })
    .click()
  await page
    .getByLabel('Contextual search', { exact: true })
    .fill('semantic retrieval knowledge discovery')
  await page.getByLabel('Keyword only', { exact: true }).check()
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('.atlas-rag-results article')).not.toHaveCount(0)
  await expect(page.locator('.atlas-rag')).toContainText('Keyword retrieval')
  const firstHitTitle = await page
    .locator('.atlas-rag-results article strong')
    .first()
    .innerText()
  await page
    .locator('.atlas-rag-results')
    .getByRole('button', { name: 'Show on map', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Neighborhood', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.atlas-inspector h2')).toHaveText(firstHitTitle)
  assert.ok(
    new URL(page.url()).searchParams.get('focus'),
    'Graph navigation should persist the focused source in the URL'
  )
  await page.screenshot({
    path: '.temp/atlas-context-search.png',
    animations: 'disabled',
    fullPage: true
  })
  await page
    .getByRole('button', { name: 'Find related knowledge', exact: true })
    .click()
  await expect(
    page.getByLabel('Contextual search', { exact: true })
  ).toHaveValue(firstHitTitle)
  await expect(page.locator('.atlas-rag-results article')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Search', exact: true })
  ).toBeEnabled()
  await page
    .getByRole('link', { name: 'Manage search index', exact: true })
    .click()
  await expect(page).toHaveURL(new RegExp(`/search\\?workspace=${workspace}`))
  await page.goBack()
  await expect(page.locator('.atlas h1')).toHaveText('Atlas')
  await expect(page.locator('.atlas-inspector h2')).toHaveText(firstHitTitle)
  await page
    .getByRole('button', { name: 'Close knowledge search', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Whole workspace', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Close page details', exact: true })
    .click()
  await page.getByRole('button', { name: 'Fit map', exact: true }).click()
  await page.getByLabel('Color', { exact: true }).selectOption('individual')
  await page.screenshot({
    path: '.temp/atlas-context-desktop.png',
    animations: 'disabled'
  })
  originalDark = await page
    .locator('html')
    .evaluate(element => element.classList.contains('dark'))
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
    path: '.temp/atlas-context-dark.png',
    animations: 'disabled'
  })
  await page
    .getByRole('button', {
      name: originalDark ? 'Switch to dark theme' : 'Switch to light theme',
      exact: true
    })
    .click()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  )
  await page.getByRole('button', { name: 'Tags', exact: true }).click()
  await expect(
    page.locator('.zillion-graph-node[data-kind="tag"]')
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Tags', exact: true }).click()
  await page.locator('.atlas-map').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: '.temp/atlas-context-mobile.png',
    animations: 'disabled',
    fullPage: true
  })
  assert.deepEqual(errors, [])
  console.log(
    'Atlas context acceptance passed: colored entities/edges, tag hubs, inferred topics, evidence, saved suggestions, reload, RAG passages, map navigation, index scope, light/dark, mobile and reduced motion.'
  )
} finally {
  if (base) await database('removeBase', {}, { id: base.id })
  if (page && originalDark !== undefined) {
    const dark = await page
      .locator('html')
      .evaluate(element => element.classList.contains('dark'))
      .catch(() => originalDark)
    if (dark !== originalDark)
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
