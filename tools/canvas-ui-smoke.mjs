import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const { workspace } = JSON.parse(
  readFileSync('.temp/widgets-chromium-classic.json', 'utf8')
)
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 }
})
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', error => errors.push(error.message))
const title = `Canvas review ${engine} ${Date.now()}`
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  await page.goto(`http://localhost:5173/dashboard?workspace=${workspace}`)
  await page.getByRole('button', { name: 'Create group', exact: true }).click()
  let popup = page.getByRole('dialog', { name: 'Group name', exact: true })
  await popup
    .getByRole('textbox', { name: 'Group name', exact: true })
    .fill(title)
  await popup.getByRole('button', { name: 'Green', exact: true }).click()
  await popup.getByRole('button', { name: 'folder open', exact: true }).click()
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  const group = page.getByRole('region', { name: title, exact: true })
  await expect(group.locator('.monolith-folder-icon')).toHaveCSS(
    'color',
    'rgb(76, 170, 120)'
  )
  await expect(group.locator('.monolith-folder-icon')).toHaveCSS(
    'width',
    '20px'
  )
  await group
    .getByRole('button', { name: `New page in ${title}`, exact: true })
    .click()
  const peek = page.locator('.monolith-page-peek')
  await expect(peek).toBeVisible()
  const name = peek.locator('.canvas-inline-page-title')
  await expect(name).toBeFocused()
  await expect(name).toHaveCSS('outline-style', 'none')
  const titleTop = (await name.boundingBox()).y
  await name.fill(title)
  assert.ok(Math.abs((await name.boundingBox()).y - titleTop) < 2)
  const editor = peek.locator('.zillion-prose').first()
  await editor.click()
  await page.keyboard.type('Alpha paragraph')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Beta paragraph')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/database')
  await page
    .getByRole('option', { name: 'Inline database', exact: true })
    .click()
  const picker = page.getByRole('region', {
    name: 'Inline database',
    exact: true
  })
  await picker
    .getByRole('textbox', { name: 'Database name', exact: true })
    .fill(title)
  await picker
    .getByRole('button', { name: 'New empty data source', exact: true })
    .click()
  const table = peek.getByRole('table', { name: title, exact: true })
  await expect(table).toBeVisible()
  await table.getByRole('button', { name: 'New page', exact: true }).click()
  const rowInput = table.getByRole('textbox')
  await rowInput.fill('Canvas record')
  await rowInput.press('Enter')
  const row = table.getByRole('row').filter({ hasText: 'Canvas record' })
  await row.hover()
  await row
    .getByRole('button', { name: 'Open Canvas record', exact: true })
    .click()
  const record = page.locator('.database-record-surface')
  await expect(record).toBeVisible()
  await record
    .getByRole('button', { name: 'Add a property', exact: true })
    .click()
  await expect(page.locator('.database-property-picker')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(record).toBeVisible()
  await record.locator('[data-close-record]').click()
  await expect(record).toHaveCount(0)
  await expect(peek).toBeVisible()
  await expect(
    peek.getByRole('button', { name: 'Add block', exact: true })
  ).toHaveCount(0)
  await peek.getByRole('button', { name: 'Side peek', exact: true }).click()
  await expect(peek).toHaveAttribute('data-mode', 'side')
  await expect(
    peek.getByRole('button', { name: 'Open as full page', exact: true })
  ).toBeEnabled()
  await peek
    .getByRole('button', { name: 'Open as full page', exact: true })
    .click()
  await expect(peek).toHaveCount(0)
  await expect(page.locator('.canvas-inline-page-title')).toHaveValue(title)
  const tab = page.locator('.monolith-view-tabs a').filter({ hasText: 'Table' })
  await tab.click()
  popup = page.getByRole('dialog', { name: 'View appearance', exact: true })
  await popup
    .getByRole('textbox', { name: 'View name', exact: true })
    .fill('Review view')
  await popup.getByLabel('Text color', { exact: true }).fill('#c14c8a')
  await popup.getByRole('button', { name: 'Group icon', exact: true }).click()
  await popup.getByRole('button', { name: 'rocket', exact: true }).click()
  await popup.getByRole('button', { name: 'Green', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.monolith-view-tabs a').filter({ hasText: 'Review view' })
  ).toBeVisible()
  await page.reload()
  const savedTab = page
    .locator('.monolith-view-tabs a')
    .filter({ hasText: 'Review view' })
  await expect(savedTab).toBeVisible()
  await expect(savedTab).toHaveCSS('border-radius', '5px')
  await expect(savedTab.locator('svg')).toHaveCSS('color', 'rgb(76, 170, 120)')
  await expect(group.locator('.monolith-folder-icon')).toHaveCSS(
    'color',
    'rgb(76, 170, 120)'
  )
  const block = page
    .locator('.canvas-block')
    .filter({ has: page.getByRole('table', { name: title, exact: true }) })
  const bounds = await block.locator('.zillion-prose > [data-node-view-wrapper], .zillion-prose > .react-renderer').first().boundingBox()
  const grip = block.locator('.monolith-block-grips button').nth(2)
  await grip.hover({ force: true })
  const point = await grip.boundingBox()
  await page.mouse.move(point.x + 10, point.y + 10)
  await page.mouse.down()
  await page.mouse.move(point.x + 120, point.y - 60, { steps: 12 })
  const preview = page.locator('.monolith-block-drag-preview')
  await expect(preview).toBeVisible()
  const size = await preview.locator(':scope > *').evaluate(element => ({
    width: element.offsetWidth,
    height: element.offsetHeight
  }))
  assert.ok(Math.abs(size.width - bounds.width) < 2)
  assert.ok(Math.abs(size.height - bounds.height) < 2)
  await expect(page.locator('.monolith-block-drop')).toBeVisible()
  await page.screenshot({ path: `.temp/canvas-${engine}-drag.png` })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(preview).toHaveCount(0)
  const paragraphGrips = page.locator('.monolith-block-grips button')
  await paragraphGrips.first().focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(page.locator('.zillion-prose > p').first()).toHaveText(
    'Beta paragraph'
  )
  await page.locator('.zillion-prose').first().focus()
  await page.keyboard.press('Control+z')
  await expect(page.locator('.zillion-prose > p').first()).toHaveText(
    'Alpha paragraph'
  )
  assert.deepEqual(errors, [])
  await page.screenshot({ path: `.temp/canvas-${engine}-complete.png` })
  console.log(
    `${engine}: sidebar creation, folder color, slash database, page surfaces, saved view appearance, drag dimensions, cancellation, keyboard reorder and undo passed`
  )
} catch (error) {
  await page
    .screenshot({ path: `.temp/canvas-${engine}-failure.png`, fullPage: true })
    .catch(() => {})
  writeFileSync(
    `.temp/canvas-${engine}-failure.txt`,
    await page.locator('body').innerText()
  )
  console.error(error)
  console.error(errors)
  process.exitCode = 1
} finally {
  await browser.close()
}

