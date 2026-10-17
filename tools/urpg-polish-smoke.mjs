import { resolveAddonIdentity } from '@monolith/configs/node'
import { chromium, expect, webkit } from '@playwright/test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium'
const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const { workspace, normal } = JSON.parse(
  readFileSync(`.temp/urpg-${engine}-result.json`, 'utf8')
)
const browser = await { chromium, webkit }[engine].launch()
const context = await browser.newContext({
  viewport: { width: 1480, height: 1080 }
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
const errors = []
let stage = 'launch'
page.on('pageerror', error => {
  const record = {
    message: error.message,
    stage,
    url: page.url(),
    viewport: page.viewportSize()
  }
  errors.push(record)
})
const shot = async name => {
  await page.waitForTimeout(220)
  await page.screenshot({
    path: `.temp/urpg-polish-${engine}-${name}.png`,
    animations: 'disabled'
  })
}
const choose = async (root, label, option) => {
  await root.getByRole('button', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
const settings = async section => {
  stage = `settings: ${section}`
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const popup = page.getByRole('dialog', { name: 'Settings', exact: true })
  await popup.getByRole('button', { name: section, exact: true }).click()
  // Wait for the settings surface to finish entering before opening its nested selector.
  await page.waitForTimeout(220)
  return popup
}
try {
  const login = await context.request.post('http://localhost:3636/auth/login', {
    data: { email: fixture.email, password: fixture.password }
  })
  assert.equal(login.status(), 200)
  const token = (await login.json()).data.accessToken
  const remote = resolveAddonIdentity({ name: '@monolith/databases' }).remoteId
  const snapshot = async () => {
    const response = await context.request.get(
      `http://localhost:3636/modules/${remote}/urpg/snapshot?workspace_id=${workspace}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    assert.ok(response.ok())
    return (await response.json()).data
  }
  await page.goto(`http://localhost:5173/urpg?workspace=${workspace}`)
  const main = page.locator('.urpg-page')
  const hud = page.locator('.urpg-sidebar-character')
  const navigation = page.getByRole('navigation', { name: 'uRPG', exact: true })
  await expect(
    main.getByRole('heading', { name: 'Aster', exact: true })
  ).toBeVisible({ timeout: 45000 })
  await expect(hud).toHaveCount(1)
  for (const name of ['Health', 'Mana', 'Experience']) {
    await expect(
      hud.getByRole('progressbar', { name, exact: true })
    ).toBeInViewport()
  }
  const before = await hud.boundingBox()
  await navigation
    .getByRole('link', { name: 'Charisma', exact: true })
    .scrollIntoViewIfNeeded()
  assert.equal(
    (await hud.boundingBox()).y,
    before.y,
    'Character stays pinned while navigation scrolls'
  )
  await expect(
    hud
      .getByRole('progressbar', { name: 'Experience', exact: true })
      .locator('.urpg-meter-fill')
  ).toHaveCSS('background-color', 'rgb(155, 97, 204)')
  await shot('overview')

  const water = hud.getByRole('progressbar', { name: 'Mana', exact: true })
  const originalWater = await water.getAttribute('aria-valuetext')
  await hud
    .getByRole('button', { name: 'Log food or water', exact: true })
    .click()
  const vitals = page.getByRole('dialog', {
    name: 'Today’s vitals',
    exact: true
  })
  await vitals
    .getByRole('button', { name: 'Log food or water', exact: true })
    .click()
  await vitals
    .getByRole('spinbutton', { name: 'Water', exact: true })
    .fill('200')
  await vitals.getByRole('button', { name: 'Log intake', exact: true }).click()
  await expect(water).not.toHaveAttribute('aria-valuetext', originalWater)
  await vitals.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(water).toHaveAttribute('aria-valuetext', originalWater)
  await page.keyboard.press('Escape')
  await expect(vitals).toHaveCount(0)
  await expect(
    hud.getByRole('button', { name: 'Log food or water', exact: true })
  ).toBeFocused()

  const state = await snapshot()
  for (const [code, name, domain] of [
    ['CRFT', 'Craft', 'The workshop'],
    ['BODY', 'Body', 'The training grounds'],
    ['EXP', 'Expertise', 'The guild'],
    ['INT', 'Intellect', 'The archive'],
    ['JOY', 'Joy', 'The tavern'],
    ['MIND', 'Mind', 'The sanctuary'],
    ['DISC', 'Discipline', 'The stronghold'],
    ['CHAR', 'Charisma', 'The fellowship']
  ]) {
    await navigation.getByRole('link', { name, exact: true }).click()
    await expect(main.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(
      main.getByText(`${domain} · ${code}`, { exact: true })
    ).toBeVisible()
    await expect(main.locator('.urpg-stat')).toHaveCount(0)
    const xp = state.ledger
      .filter(entry => !entry.voided && entry.stat === code)
      .reduce((sum, entry) => sum + entry.xp, 0)
    const level = Math.floor((1 + Math.sqrt(1 + xp / 62.5)) / 2)
    await expect(
      main.getByRole('progressbar', { name: `${name} experience`, exact: true })
    ).toHaveAttribute('aria-valuenow', String(xp - 250 * level * (level - 1)))
    await expect(main.locator('.urpg-skill')).toHaveCount(
      state.skills.filter(skill => skill.stat === code).length
    )
    await expect(
      hud.getByRole('progressbar', { name: 'Health', exact: true })
    ).toBeInViewport()
    if (code === 'CRFT' || code === 'BODY') await shot(code.toLowerCase())
  }
  await navigation.getByRole('link', { name: 'Body', exact: true }).click()
  await main.getByRole('button', { name: 'New item', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'New item', exact: true })
  await expect(
    editor.getByRole('button', { name: 'Stat', exact: true })
  ).toContainText('Body')
  await shot('item')
  await page.keyboard.press('Escape')
  await main.getByRole('button', { name: 'Skill tree', exact: true }).click()
  await expect(main.locator('.urpg-skill')).toHaveCount(
    state.skills.filter(skill => skill.stat === 'BODY').length
  )
  await main
    .getByRole('button', { name: 'Show all stats', exact: true })
    .click()
  await expect(main.locator('.urpg-stat')).toHaveCount(8)

  let popup = await settings('Widgets')
  const profileToggle = popup.getByLabel('Show Character profile in sidebar', {
    exact: true
  })
  stage = 'hide character profile'
  await profileToggle.click()
  await expect(hud).toHaveCount(0)
  stage = 'show character profile'
  await profileToggle.click()
  await expect(hud).toHaveCount(1)
  await page.keyboard.press('Escape')
  stage = 'reload profile preferences'
  await page.reload()
  await expect(hud).toHaveCount(1)
  await expect(
    page.locator('.monolith-sidebar-widget[aria-label="Character profile"]')
  ).toHaveCount(0)

  popup = await settings('Preferences')
  const originalTheme = (
    await popup.getByRole('button', { name: 'Theme', exact: true }).innerText()
  ).trim()
  await choose(popup, 'Theme', 'Light')
  await page.keyboard.press('Escape')
  await navigation.getByRole('link', { name: 'Craft', exact: true }).click()
  await shot('light')
  popup = await settings('Preferences')
  await choose(popup, 'Theme', originalTheme)
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 760, height: 900 })
  await shot('narrow')
  assert.ok(
    await main.evaluate(
      element => element.scrollWidth <= element.clientWidth + 1
    ),
    'No horizontal overflow'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await shot('phone')
  assert.ok(
    await main.evaluate(
      element => element.scrollWidth <= element.clientWidth + 1
    ),
    'No overflow at phone width'
  )
  await page.setViewportSize({ width: 1200, height: 720 })
  await page.goto(`http://localhost:5173/urpg?workspace=${workspace}&stat=CRFT`)
  await expect(
    hud.getByRole('progressbar', { name: 'Experience', exact: true })
  ).toBeInViewport()
  await shot('short')
  await page.goto(`http://localhost:5173/urpg?workspace=${normal}`)
  await expect(
    page.getByRole('button', { name: 'Activate uRPG', exact: true })
  ).toBeVisible()
  await expect(hud).toHaveCount(0)
  await expect(page.getByText(/\[MISSING LOCALE\]/)).toHaveCount(0)
  assert.deepEqual(errors, [])
  console.log(
    `${engine}: pinned HUD, live vitals, eight stat dashboards, scoped creation, widget preferences, themes and responsive layout passed`
  )
  writeFileSync(
    `.temp/urpg-polish-${engine}-result.json`,
    JSON.stringify({ engine, workspace, passed: true, errors }, null, 2)
  )
} catch (error) {
  writeFileSync(
    `.temp/urpg-polish-${engine}-result.json`,
    JSON.stringify(
      { engine, workspace, passed: false, errors, failure: String(error) },
      null,
      2
    )
  )
  await shot('failure').catch(() => {})
  writeFileSync(
    `.temp/urpg-polish-${engine}-failure.txt`,
    `${error}\n${JSON.stringify(errors, null, 2)}\n${await page.locator('body').innerText()}`
  )
  throw error
} finally {
  await browser.close()
}
