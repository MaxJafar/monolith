import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1480, height: 1080 }
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
const capture = async options => {
  // Allow the shared 160 ms enter/exit motion to finish before visual review.
  await page.waitForTimeout(220)
  await page.screenshot({ ...options, animations: 'disabled' })
}
const errors = []
page.on('pageerror', error => errors.push(error.message))
let workspace, normal
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  async function call(route, data, query = {}) {
    const res = await context.request.fetch(
      `http://localhost:3636/modules/${remote}/${route}?${new URLSearchParams(query)}`,
      {
        method: data === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data
      }
    )
    assert.ok(
      res.ok(),
      `${route}: ${res.status()} ${res.ok() ? '' : await res.text()}`
    )
    return (await res.json()).data
  }
  const settings = async section => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const popup = page.getByRole('dialog', { name: 'Settings', exact: true })
    await popup.getByRole('button', { name: section, exact: true }).click()
    return popup
  }
  const choose = async (root, label, option) => {
    await root.getByRole('button', { name: label, exact: true }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
  }
  normal = await call('workspaces/create', {
    name: `uRPG widget check ${engine} ${Date.now()}`,
    profile: 'personal',
    icon: 'lucide:layers',
    enabled_modules: ['databases'],
    description: 'Synthetic acceptance fixture'
  })
  await page.goto(`http://localhost:5173/urpg?workspace=${normal.id}`)
  await expect(
    page.getByRole('button', { name: 'Activate uRPG', exact: true })
  ).toBeVisible({ timeout: 45000 })
  let popup = await settings('Addons')
  await popup
    .getByRole('button', { name: 'Activate uRPG', exact: true })
    .click()
  popup = page.getByRole('dialog', {
    name: 'Create your uRPG character',
    exact: true
  })
  await popup.getByLabel('Character name', { exact: true }).fill('Aster')
  await popup
    .getByLabel('Workspace name', { exact: true })
    .fill(`Aster’s campaign · ${engine}`)
  await popup.getByLabel('Age · optional', { exact: true }).fill('30')
  await popup.getByLabel('Weight in kg · optional', { exact: true }).fill('70')
  const portrait = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#9583bb'
    ctx.fillRect(0, 0, 32, 32)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await popup
    .getByLabel('Upload your character', { exact: true })
    .setInputFiles({
      name: 'fixture.png',
      mimeType: 'image/png',
      buffer: Buffer.from(portrait, 'base64')
    })
  await expect(
    popup.getByRole('img', { name: 'Character portrait' })
  ).toBeVisible()
  await capture({ path: `.temp/urpg-${engine}-wizard.png` })
  await popup.getByRole('button', { name: 'Continue', exact: true }).click()
  await popup
    .getByLabel('Daily calorie target · kcal', { exact: true })
    .fill('2100')
  await popup
    .getByLabel('Daily water target · ml', { exact: true })
    .fill('2000')
  await popup.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(popup.getByText(/Epic → Mission/)).toBeVisible()
  await popup
    .getByRole('button', { name: 'Begin your campaign', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Aster', exact: true })
  ).toBeVisible()
  workspace = new URL(page.url()).searchParams.get('workspace')
  assert.notEqual(workspace, normal.id)
  const scope = { workspace_id: workspace }
  const snap = () => call('urpg/snapshot', undefined, scope)
  assert.equal((await snap()).character.age, 30)
  const main = page.locator('.urpg-page')
  await main.getByRole('button', { name: 'New item', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'New item', exact: true })
  await popup
    .getByLabel('Title', { exact: true })
    .fill('Write the landing page')
  await choose(popup, 'Difficulty', 'Medium · 1.5×')
  await choose(popup, 'Skill', 'Writing')
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  await main
    .getByRole('button', {
      name: 'Complete Write the landing page',
      exact: true
    })
    .click()
  popup = page.getByRole('dialog', { name: 'Complete', exact: true })
  await choose(popup, 'Completion quality', 'Strong · 1.25×')
  await expect(popup.getByText('+187 XP', { exact: true })).toBeVisible()
  await popup.getByRole('button', { name: 'Complete', exact: true }).click()
  await expect
    .poll(async () =>
      (await snap()).ledger.reduce(
        (sum, entry) => sum + (entry.voided ? 0 : entry.xp),
        0
      )
    )
    .toBe(187)
  console.log('Wizard, avatar, XP and skill progression passed')
  await main
    .getByRole('button', { name: 'Log food or water', exact: true })
    .click()
  await main.getByRole('spinbutton', { name: 'Water', exact: true }).fill('500')
  await main.getByRole('button', { name: 'Log intake', exact: true }).click()
  await expect(
    main.getByRole('progressbar', { name: 'Mana', exact: true })
  ).toHaveAttribute('aria-valuenow', '500')
  await main
    .getByRole('button', { name: 'Log food or water', exact: true })
    .click()
  await main.getByRole('button', { name: 'Food', exact: true }).click()
  await main.getByRole('spinbutton', { name: 'Food', exact: true }).fill('600')
  await main.getByRole('button', { name: 'Log intake', exact: true }).click()
  await expect(
    main.getByRole('progressbar', { name: 'Health', exact: true })
  ).toHaveAttribute('aria-valuenow', '600')
  await main.getByRole('button', { name: 'Rituals', exact: true }).click()
  await main.getByRole('button', { name: 'New item', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'New item', exact: true })
  await popup.getByLabel('Title', { exact: true }).fill('Morning journal')
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  await main
    .getByRole('button', { name: 'Complete Morning journal', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Complete', exact: true })
    .getByRole('button', { name: 'Complete', exact: true })
    .click()
  await expect
    .poll(async () => (await snap()).ledger.filter(e => !e.voided).length)
    .toBe(2)
  await main.getByRole('button', { name: 'Reward shop', exact: true }).click()
  await main.getByRole('button', { name: 'Add', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'New reward', exact: true })
  await popup.getByLabel('Title', { exact: true }).fill('A movie evening')
  await popup.getByLabel('Cost · coins', { exact: true }).fill('10')
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  await main
    .getByRole('button', { name: 'Unlock · 10 coins', exact: true })
    .click()
  await expect(
    main.getByText('11 coins available this week', { exact: true })
  ).toBeVisible()
  await main.getByRole('button', { name: 'Refund', exact: true }).click()
  await expect(
    main.getByText('21 coins available this week', { exact: true })
  ).toBeVisible()
  await main.getByRole('button', { name: 'Recovery', exact: true }).click()
  await main.getByRole('button', { name: 'Add', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'New debuff', exact: true })
  await popup.getByLabel('Title', { exact: true }).fill('Doomscroll fatigue')
  await popup.getByLabel('Recovery action', { exact: true }).fill('Take a walk')
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  await main
    .getByRole('button', { name: 'Recovery complete', exact: true })
    .click()
  await expect(
    main.getByText('No active debuffs. Keep a sustainable rhythm.', {
      exact: true
    })
  ).toBeVisible()
  await main.getByRole('button', { name: 'Encounters', exact: true }).click()
  await main.getByRole('button', { name: 'Add', exact: true }).click()
  popup = page.getByRole('dialog', { name: 'Log an encounter', exact: true })
  await popup.getByLabel('Title', { exact: true }).fill('Design focus')
  await popup.getByRole('button', { name: 'Save', exact: true }).click()
  await main.getByRole('button', { name: 'Reflection', exact: true }).click()
  await expect(main.getByText('30 min', { exact: true })).toBeVisible()
  await capture({ path: `.temp/urpg-${engine}-reflection.png` })
  console.log('Rituals, vitals, rewards, recovery and reflection passed')
  for (const kind of ['Desktop', 'Connections', 'Activity']) {
    await page.getByRole('button', { name: kind, exact: true }).click()
    popup = page.getByRole('dialog', { name: kind, exact: true })
    await expect(popup).toBeVisible()
    if (kind === 'Activity')
      await expect(
        popup.getByText('Write the landing page', { exact: true })
      ).toBeVisible()
    await capture({ path: `.temp/urpg-${engine}-${kind.toLowerCase()}.png` })
    await page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
  }
  popup = await settings('Widgets')
  await popup
    .getByRole('button', { name: 'Configure Calendar', exact: true })
    .click()
  await choose(popup, 'Calendar view', 'Week')
  await capture({ path: `.temp/urpg-${engine}-widgets.png` })
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(
    main.getByRole('heading', { name: 'Aster', exact: true })
  ).toBeVisible()
  popup = await settings('Widgets')
  await popup
    .getByRole('button', { name: 'Configure Calendar', exact: true })
    .click()
  await expect(
    popup.getByRole('button', { name: 'Calendar view', exact: true })
  ).toContainText('Week')
  await popup.getByRole('button', { name: 'Addons', exact: true }).click()
  await popup
    .getByRole('button', { name: 'Disable in this workspace', exact: true })
    .click()
  await popup
    .getByRole('button', { name: 'Resume campaign', exact: true })
    .click()
  await expect(
    main.getByRole('heading', { name: 'Aster', exact: true })
  ).toBeVisible()
  assert.equal(new URL(page.url()).searchParams.get('workspace'), workspace)
  assert.equal((await snap()).ledger.filter(e => !e.voided).length, 2)
  console.log('Utilities, widget persistence, disable and resume passed')
  await main.getByRole('button', { name: 'Overview', exact: true }).click()
  await capture({ path: `.temp/urpg-${engine}-overview.png` })
  await page.setViewportSize({ width: 760, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await capture({ path: `.temp/urpg-${engine}-narrow.png` })
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    ),
    false
  )
  await page.setViewportSize({ width: 1480, height: 1080 })
  await page.goto(`http://localhost:5173/urpg?workspace=${normal.id}`)
  await expect(
    page.getByRole('button', { name: 'Activate uRPG', exact: true })
  ).toBeVisible()
  popup = await settings('Widgets')
  await popup
    .getByLabel('Show Habit tracker in sidebar', { exact: true })
    .click()
  await popup
    .getByRole('textbox', { name: 'New habit', exact: true })
    .fill('Read ten pages')
  await popup.getByRole('button', { name: 'Add habit', exact: true }).click()
  await popup
    .getByRole('button', { name: 'Read ten pages', exact: true })
    .click()
  await expect(
    popup.getByText('Days completed: 1', { exact: true })
  ).toBeVisible()
  const habits = await call('workspaceWidgets/habits', undefined, {
    workspace_id: normal.id
  })
  assert.equal(habits.habits[0].days.length, 1)
  await popup
    .getByLabel('Show Stocks & crypto in sidebar', { exact: true })
    .click()
  await popup
    .getByLabel('Stock symbols · up to 5', { exact: true })
    .fill('AAPL')
  await popup
    .getByLabel('CoinGecko coin IDs · up to 5', { exact: true })
    .fill('')
  await popup
    .getByRole('button', { name: 'Save watchlist', exact: true })
    .click()
  await expect(
    popup.getByText(
      'Connect a Finnhub key in the API vault to see stock quotes.',
      { exact: true }
    )
  ).toBeVisible()
  await capture({ path: `.temp/urpg-${engine}-market.png` })
  await page.keyboard.press('Escape')
  await page.reload()
  const habitWidget = page.getByRole('region', {
    name: 'Habit tracker',
    exact: true
  })
  await expect(
    habitWidget.getByRole('button', { name: 'Read ten pages', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await page.goto(`http://localhost:5173/urpg?workspace=${workspace}`)
  await expect(
    main.getByRole('heading', { name: 'Aster', exact: true })
  ).toBeVisible()
  await expect(page.getByText(/\[MISSING LOCALE\]/)).toHaveCount(0)
  console.log('Regular workspace habits and market setup passed')
  const workspaceRow = (await call('workspaces/list')).find(w => w.id === workspace)
  await call('workspaces/saveAppearance', { scope: 'workspace', appearance: { accent: '#9b61cc' }, expected_revision: workspaceRow.navigation.revision }, scope)
  await page.reload()
  await expect(main.getByRole('progressbar', { name: 'Experience', exact: true }).locator('.urpg-meter-fill')).toHaveCSS('background-color', 'rgb(155, 97, 204)')
  popup = await settings('Preferences')
  const originalTheme = (await popup.getByRole('button', { name: 'Theme', exact: true }).innerText()).trim()
  await choose(popup, 'Theme', 'Light')
  await page.keyboard.press('Escape')
  await capture({ path: `.temp/urpg-${engine}-light.png` })
  await main.getByRole('button', { name: 'New item', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'New item', exact: true })).toBeVisible()
  await capture({ path: `.temp/urpg-${engine}-light-popover.png` })
  await page.keyboard.press('Escape')
  popup = await settings('Preferences')
  await choose(popup, 'Theme', originalTheme)
  await page.keyboard.press('Escape')
  await capture({ path: `.temp/urpg-${engine}-overview.png` })
  console.log('Light/dark themes, reduced motion and customization color passed')
  assert.deepEqual(errors, [])
  writeFileSync(
    `.temp/urpg-${engine}-result.json`,
    JSON.stringify(
      { engine, workspace, normal: normal.id, errors, passed: true },
      null,
      2
    )
  )
} catch (error) {
  console.error(error)
  await capture({
    path: `.temp/urpg-${engine}-failure.png`,
    fullPage: true
  }).catch(() => {})
  writeFileSync(
    `.temp/urpg-${engine}-failure.json`,
    JSON.stringify(
      {
        workspace,
        normal: normal?.id,
        url: page.url(),
        errors,
        body: await page
          .locator('body')
          .innerText()
          .catch(() => '')
      },
      null,
      2
    )
  )
  process.exitCode = 1
} finally {
  await browser.close()
}
