import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const { workspace } = JSON.parse(
  readFileSync('.temp/macos-ui/widgets.json', 'utf8')
)
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch()
  try {
    const context = await browser.newContext({
      viewport: { width: 1360, height: 900 }
    })
    const login = await context.request.post(
      'http://localhost:3636/auth/login',
      {
        data: { email: fixture.email, password: fixture.password }
      }
    )
    assert.equal(login.status(), 200)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`http://localhost:5173/dashboard?workspace=${workspace}`)
    await expect(
      page.getByRole('button', { name: 'Edit layout', exact: true })
    ).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.monolith-chrome-brand')).toHaveCount(1)
    await expect(page.getByRole('tab')).toHaveCount(1)
    await page.getByRole('button', { name: 'New tab', exact: true }).click()
    const searchOverlay = page.getByRole('dialog', {
      name: 'Search',
      exact: true
    })
    await expect(searchOverlay).toBeVisible()
    await searchOverlay
      .locator('#workspace-search-results > [role="option"]')
      .first()
      .click()
    await expect(page.getByRole('tab')).toHaveCount(2)
    await expect(page.getByRole('tab').last()).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await page.getByRole('tab').first().click()
    await expect(
      page.getByRole('button', { name: 'Edit layout', exact: true })
    ).toBeVisible()
    await page.getByRole('tab').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab').last()).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await page
      .locator(
        '.monolith-workspace-tab[data-active="true"] .monolith-tab-close'
      )
      .click()
    await expect(page.getByRole('tab')).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Edit layout', exact: true })
    ).toBeVisible()
    const addons = page
      .locator('section[aria-label="Addons"] > div')
      .first()
      .getByRole('button', { name: 'Addons', exact: true })
    await addons.click()
    await expect(addons).toHaveAttribute('aria-expanded', 'false')
    await page.reload()
    await expect(addons).toHaveAttribute('aria-expanded', 'false')
    await addons.click()
    await page
      .getByRole('button', { name: 'Page settings and actions' })
      .click()
    await expect(
      page.getByRole('menuitem', { name: 'Appearance and layout', exact: true })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Ag Serif', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Ag Serif', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Ag Default', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Ag Default', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await page.screenshot({
      path: `.temp/chrome-${name}.png`,
      animations: 'disabled'
    })
    const sidebar = page.locator('#workspace-navigation')
    assert.ok((await sidebar.boundingBox()).height <= 900)
    const search = page.locator('.monolith-global-search')
    const beforeSearch = page.url()
    const modifier = await search.getAttribute('aria-keyshortcuts')
    await page.keyboard.press(modifier === 'Meta+k' ? 'Meta+k' : 'Control+k')
    await expect(searchOverlay).toBeVisible()
    assert.equal(page.url(), beforeSearch)
    await page.keyboard.press('Escape')
    await expect(searchOverlay).toHaveCount(0)
    await page.goto(
      `http://localhost:5173/page/${fixture.page}?workspace=${fixture.workspace}`
    )
    await expect(page.locator('editor-host')).toBeVisible({ timeout: 30000 })
    const paragraphs = page.locator('affine-paragraph')
    const first = paragraphs.first()
    const blockId = await first.getAttribute('data-block-id')
    await first.locator('.monolith-document-grip').click({ force: true })
    await page.getByRole('menuitem', { name: 'Turn into', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Heading 2', exact: true }).click()
    await expect(first).toHaveAttribute('data-block-id', blockId)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    const count = await paragraphs.count()
    await page.getByRole('button', { name: 'Add block', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Heading 2', exact: true }).click()
    await expect(paragraphs).toHaveCount(count + 1)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(paragraphs).toHaveCount(count)
    await page
      .getByRole('button', { name: 'Page settings and actions' })
      .click()
    await expect(
      page.getByRole('menuitem', { name: 'Export Markdown', exact: true })
    ).toBeVisible()
    await page.screenshot({
      path: `.temp/page-menu-${name}.png`,
      animations: 'disabled'
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('.monolith-save-status')).toHaveText(
      'Saved to server',
      { timeout: 20000 }
    )
    await page.goto(`http://localhost:5173/dashboard?workspace=${workspace}`)
    await expect(
      page.getByRole('button', { name: 'Edit layout', exact: true })
    ).toBeVisible()
    await page.setViewportSize({ width: 480, height: 700 })
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    )
    assert.deepEqual(errors, [])
    console.log(
      `PASS ${name}: tabs, persistent collapse, page settings, block actions/insert/undo, sidebar bounds, scoped search, 480px layout, no runtime errors.`
    )
  } finally {
    await browser.close()
  }
}
