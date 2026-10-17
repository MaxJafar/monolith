import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test('product preview supports keyboard navigation and theme persists', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle('Monolith — Make space for what matters.')
  await page.getByRole('tab', { name: 'Workspace', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Docs & databases' })
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#panel-documents')).toBeVisible()
  await expect(page.locator('#panel-workspace')).toBeHidden()
  await page.getByRole('button', { name: 'Switch to dark theme' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('button', { name: 'Switch to light theme' })
  ).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('search finds a guide, supports keyboard selection and restores focus', async ({
  page
}) => {
  await page.goto('/docs')
  const trigger = page.getByRole('button', {
    name: 'Search documentation',
    exact: true
  })
  await trigger.click()
  const input = page.getByRole('searchbox', {
    name: 'Search Monolith documentation'
  })
  await input.fill('MCP')
  await expect(
    page.locator('#search-results .search-result').first()
  ).toContainText('MCP and CLI')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.locator('#search-results .search-result').first()
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Control+k')
  await input.fill('scheduled execution')
  await expect(page.locator('#search-results')).toContainText('Automations')
  await input.fill('MCP')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/docs\/agents$/)
  await expect(
    page.getByRole('heading', { name: 'MCP and CLI', exact: true })
  ).toBeVisible()
})

test('search has honest empty and network failure states with retry', async ({
  page
}) => {
  await page.route('**/search.json', (route) => route.abort())
  await page.goto('/docs')
  await page
    .getByRole('button', { name: 'Search documentation', exact: true })
    .click()
  await expect(page.locator('#search-results')).toContainText(
    'Search could not load'
  )
  await page.unroute('**/search.json')
  await page.getByRole('button', { name: 'Retry search' }).click()
  await expect(page.locator('#search-results .search-result')).not.toHaveCount(
    0
  )
  await page.getByRole('searchbox').fill('<img src=x onerror=alert(1)>')
  await expect(page.locator('#search-results')).toContainText('No results')
  await expect(page.locator('#search-results img')).toHaveCount(0)
})

test('collection combines type, category and text filters and can reset', async ({
  page
}) => {
  await page.goto('/addons')
  await expect(page.locator('[data-addon-card]:visible')).toHaveCount(14)
  await page.getByRole('button', { name: 'Widgets', exact: true }).click()
  await expect(page.locator('[data-addon-card]:visible')).toHaveCount(5)
  await page.getByLabel('Filter by category').selectOption('Productivity')
  await expect(page.locator('[data-addon-card]:visible')).toHaveCount(2)
  await page
    .getByRole('searchbox', { name: 'Search addons and widgets' })
    .fill('Pomodoro')
  await expect(page.locator('[data-addon-card]:visible')).toHaveCount(1)
  await expect(page.locator('[data-addon-count]')).toHaveText(
    '1 tool in the collection'
  )
  await page.getByRole('searchbox').fill('not-a-tool')
  await expect(page.locator('[data-addon-empty]')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.locator('[data-addon-card]:visible')).toHaveCount(14)
  await page
    .locator('[data-addon-card]')
    .filter({ has: page.getByRole('heading', { name: 'Atlas', exact: true }) })
    .click()
  await expect(page).toHaveURL(/\/addons\/atlas$/)
  await page.getByRole('link', { name: 'Read the setup guide' }).click()
  await expect(page).toHaveURL(/\/docs\/atlas$/)
})

test('mobile navigation, docs navigation and reduced motion work', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(
    page.getByRole('button', { name: 'Close navigation' })
  ).toHaveAttribute('aria-expanded', 'true')
  await page
    .locator('#mobile-nav')
    .getByRole('link', { name: 'Documentation', exact: true })
    .click()
  await page.getByText('Browse documentation', { exact: true }).click()
  await page
    .locator('.docs-mobile-nav')
    .getByRole('link', { name: 'Widgets and dashboards', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Widgets and dashboards', exact: true })
  ).toBeVisible()
  expect(
    await page
      .locator('html')
      .evaluate((element) => getComputedStyle(element).scrollBehavior)
  ).toBe('auto')
})

test('key pages fit narrow, tablet and desktop viewports without runtime errors', async ({
  page
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir('.temp/site-screenshots', { recursive: true })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 })
    for (const route of [
      '/',
      '/addons',
      '/product/knowledge',
      '/docs/agents',
      '/docs/databases'
    ]) {
      await page.goto(route)
      await page.evaluate(() => document.fonts.ready)
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        view: innerWidth
      }))
      expect(dimensions.scroll, `${route} at ${width}px`).toBeLessThanOrEqual(
        dimensions.view + 1
      )
      await expect(page.locator('h1')).toHaveCount(1)
      if (
        (width === 1440 || width === 390) &&
        ['/', '/addons', '/docs/agents'].includes(route)
      ) {
        await page.screenshot({
          path: `.temp/site-screenshots/${testInfo.project.name}-${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}.png`,
          fullPage: true,
          animations: 'disabled'
        })
        if (route === '/')
          await page.screenshot({
            path: `.temp/site-screenshots/${testInfo.project.name}-home-viewport-${width}.png`,
            animations: 'disabled'
          })
      }
    }
  }
  expect(errors).toEqual([])
})

test('static content and documentation remain usable without JavaScript', async ({
  browser
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(process.env.SITE_TEST_URL || 'http://127.0.0.1:4321')
  await page
    .getByRole('link', { name: 'Explore the docs', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'A good place to start.' })
  ).toBeVisible()
  await page.locator('a.doc-card[href="/docs/installation"]').click()
  await expect(page.locator('.prose')).toContainText(
    'pnpm install --frozen-lockfile'
  )
  await context.close()
})
