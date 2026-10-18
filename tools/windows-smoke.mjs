import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { remote } from 'webdriverio'

const fixture = JSON.parse(readFileSync('.temp/desktop-fixture.json', 'utf8'))
const driver = spawn(
  resolve(process.env.USERPROFILE, '.cargo/bin/tauri-driver.exe'),
  [
    '--native-driver',
    resolve(
      '.temp/toolchains/edgedriver',
      process.env.WEBVIEW2_VERSION || '155.0.4283.45',
      'msedgedriver.exe'
    )
  ],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
)
driver.stdout.on('data', () => {})
driver.stderr.on('data', chunk => process.stderr.write(chunk))
let browser
try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch('http://127.0.0.1:4444/status')
      break
    } catch {
      await new Promise(r => setTimeout(r, 250))
    }
  }
  browser = await remote({
    hostname: '127.0.0.1',
    port: 4444,
    logLevel: 'error',
    connectionRetryCount: 0,
    capabilities: {
      'tauri:options': {
        application:
          process.env.MONOLITH_DESKTOP_EXECUTABLE ||
          resolve(process.env.LOCALAPPDATA, 'Monolith/monolith-desktop.exe')
      }
    }
  })
  await browser.waitUntil(async () => !!(await browser.$('body').getText()), {
    timeout: 30000
  })
  await browser.saveScreenshot('.temp/windows-start.png')
  console.log('Initial UI:', (await browser.$('body').getText()).slice(0, 500))
  if (await browser.$('#server').isExisting()) {
    await browser.$('#server').setValue(fixture.origin)
    await browser.$('button[type="submit"]').click()
  }
  await browser.waitUntil(
    async () =>
      (await browser.$('#email').isExisting()) ||
      (await browser.$('.monolith-workspace-tabs').isExisting()),
    { timeout: 30000 }
  )
  if (await browser.$('#email').isExisting()) {
    await browser.waitUntil(
      async () => {
        if (await browser.$('.monolith-workspace-tabs').isExisting())
          return true
        try {
          await browser.$('#email').setValue(fixture.email)
          await browser.$('#password').setValue(fixture.password)
          await browser.$('button[type="submit"]').click()
          return true
        } catch (error) {
          if (String(error).includes('stale element')) return false
          throw error
        }
      },
      {
        timeout: 30000,
        interval: 250,
        timeoutMsg: 'Sign-in form did not settle'
      }
    )
    await browser.waitUntil(
      async () => !(await browser.$('#password').isExisting()),
      { timeout: 30000, timeoutMsg: 'Desktop sign-in failed' }
    )
  }
  await browser.waitUntil(
    async () =>
      (await browser.$('body').getText()).includes('Desktop acceptance'),
    { timeout: 60000 }
  )
  console.log(
    'Signed-in UI:',
    (await browser.$('body').getText()).slice(0, 1800)
  )
  assert.ok(
    await browser.execute(
      async () => (await document.fonts.load('500 14px Inter')).length > 0
    ),
    'The bundled Inter font must load in WebView2'
  )
  await browser.saveScreenshot('.temp/windows-signed-in.png')
  const manifest = await browser.execute(() =>
    window.__TAURI__.core.invoke('native_host', {
      operation: 'request',
      args: {
        request: {
          path: '/api/modules/manifest',
          headers: { 'X-Monolith-Package-Names': '1' }
        }
      }
    })
  )
  assert.equal(manifest.status, 200)
  const addons = JSON.parse(manifest.body).data.modules
  assert.ok(addons.length > 0)
  assert.ok(addons.every(addon => addon.name.startsWith('@monolith/')))
  console.log('Native bridge preserves the Monolith addon protocol header.')
  assert.equal((await browser.$$('.monolith-chrome-brand')).length, 1)
  await browser.$('button[aria-label="Maximize window"]').click()
  await browser
    .$('button[aria-label="Restore window"]')
    .waitForExist({ timeout: 10000 })
  await browser.$('button[aria-label="Restore window"]').click()
  await browser
    .$('button[aria-label="Maximize window"]')
    .waitForExist({ timeout: 10000 })
  await browser.$('button[aria-label="New tab"]').click()
  await browser.$('[data-workspace-overlay="search"]').waitForDisplayed()
  await browser
    .$('#workspace-search-results > [role="option"]:first-child')
    .waitForExist({ timeout: 15000 })
  await browser
    .$('#workspace-search-results > [role="option"]:first-child')
    .click()
  await browser.waitUntil(
    async () => (await browser.$$('[role="tab"]')).length === 2
  )
  await browser
    .$('.monolith-workspace-tab[data-active="true"] .monolith-tab-close')
    .click()
  await browser.waitUntil(
    async () => (await browser.$$('[role="tab"]')).length === 1
  )
  await browser.$('button[aria-label="Page settings and actions"]').click()
  await browser.$('[role="menu"]').waitForDisplayed()
  assert.ok(
    (await browser.$('[role="menu"]').getText()).includes('Connection & drafts')
  )
  await browser.keys('Escape')
  const sidebarBounds = await browser.execute(() => {
    const sidebar = document.querySelector('#workspace-navigation')
    return {
      bottom: sidebar.getBoundingClientRect().bottom,
      height: innerHeight
    }
  })
  assert.ok(sidebarBounds.bottom <= sidebarBounds.height + 1)
  const beforeSearch = await browser.getUrl()
  await browser.keys(['Control', 'k'])
  await browser.keys('NULL')
  await browser
    .$('[data-workspace-overlay="search"]')
    .waitForDisplayed({ timeout: 10000 })
  assert.equal(await browser.getUrl(), beforeSearch)
  await browser.saveScreenshot('.temp/windows-workspace-search.png')
  await browser.keys('Escape')
  await browser
    .$('[data-workspace-overlay="search"]')
    .waitForExist({ reverse: true })
  const resizeSidebar = await browser.$(
    '[role="separator"][aria-label="Resize sidebar"]'
  )
  const previousWidth = Number(
    await resizeSidebar.getAttribute('aria-valuenow')
  )
  await resizeSidebar.click()
  await browser.keys('ArrowRight')
  await browser.waitUntil(
    async () =>
      Number(await resizeSidebar.getAttribute('aria-valuenow')) ===
      Math.min(420, previousWidth + 8)
  )
  await browser.keys('ArrowLeft')
  await browser.$('.monolith-sidebar-utilities > button').click()
  await browser.$('[data-workspace-overlay="settings"]').waitForDisplayed()
  const settingsInput = await browser.$(
    '[data-workspace-overlay="settings"] input[aria-label="Search settings"]'
  )
  assert.ok(
    (await settingsInput.getSize()).height <= 40,
    'Settings search input keeps a compact height'
  )
  assert.ok(
    (await browser.$('[data-workspace-overlay="settings"]').getText()).includes(
      'Sidebar width'
    )
  )
  await browser.saveScreenshot('.temp/windows-workspace-settings.png')
  await browser.keys('Escape')
  await browser
    .$('[data-workspace-overlay="settings"]')
    .waitForExist({ reverse: true })
  console.log(
    'Windows search/settings overlays, sidebar resize and new tabs passed.'
  )
  await browser.execute(() => {
    window.__testErrors = []
    window.addEventListener('error', event =>
      window.__testErrors.push(event.message)
    )
    window.addEventListener('unhandledrejection', event =>
      window.__testErrors.push(String(event.reason))
    )
  })
  await browser.execute(path => {
    history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `/page/${fixture.page}?workspace=${fixture.workspace}`)
  await browser.$('editor-host').waitForExist({ timeout: 45000 })
  assert.equal((await browser.$$('editor-host')).length, 1)
  await browser.waitUntil(
    async () => {
      const errors = await browser.execute(() => window.__testErrors)
      if (errors.length) throw Error(errors.join('\n'))
      return await browser.$('affine-paragraph').isExisting()
    },
    { timeout: 20000 }
  )
  console.log('Editor UI:', (await browser.$('body').getText()).slice(-2200))
  await browser.saveScreenshot('.temp/windows-editor.png')
  const profile = await browser.execute(() =>
    window.__TAURI__.core.invoke('native_host', {
      operation: 'profile',
      args: {}
    })
  )
  assert.equal(profile.accountId, fixture.owner)
  await browser.waitUntil(
    async () =>
      (await browser.$('body').getText()).includes('Inline database record'),
    { timeout: 30000, timeoutMsg: 'Database record did not render' }
  )
  console.log('Embeds:', (await browser.$('body').getText()).slice(-2400))
  await browser.saveScreenshot('.temp/windows-embeds.png')
  const selected = await browser.$(
    'select[aria-label="Item type Inline database record"]'
  )
  await selected.selectByAttribute('value', 'task')
  await browser.waitUntil(async () => (await selected.getValue()) === 'task', {
    timeout: 10000
  })
  assert.equal(
    (await browser.$$('[data-monolith-selected="true"]')).length,
    0,
    'Database interaction must not select page blocks'
  )
  const marker = ' Native save ' + Date.now()
  const paragraph = await browser.$('affine-paragraph [contenteditable="true"]')
  await paragraph.addValue(marker)
  const documentPath = `/api/v1/editor-documents/page/${fixture.page}?workspaceId=${fixture.workspace}`
  await browser.waitUntil(
    async () => {
      const response = await browser.execute(
        path =>
          window.__TAURI__.core.invoke('native_host', {
            operation: 'request',
            args: { request: { path } }
          }),
        documentPath
      )
      return response.status === 200 && response.body.includes(marker)
    },
    {
      timeout: 20000,
      timeoutMsg: 'Typed content did not reach canonical storage'
    }
  )
  assert.equal((await browser.$$('editor-host')).length, 1)
  await browser.reloadSession()
  await browser.waitUntil(
    async () =>
      (await browser.$('body').getText()).includes('Desktop acceptance'),
    { timeout: 30000 }
  )
  await browser.execute(path => {
    history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `/page/${fixture.page}?workspace=${fixture.workspace}`)
  await browser.waitUntil(
    async () => (await browser.$('body').getText()).includes(marker.trim()),
    {
      timeout: 30000,
      timeoutMsg: 'Saved content was not restored after app restart'
    }
  )
  await browser.waitUntil(
    async () =>
      await browser
        .$('select[aria-label="Item type Inline database record"]')
        .isExisting(),
    { timeout: 20000 }
  )
  assert.equal(
    await browser
      .$('select[aria-label="Item type Inline database record"]')
      .getValue(),
    'task'
  )
  console.log(
    'Native typing, inline database edit, autosave and credential-backed app restart passed.'
  )
  if (process.argv.includes('--widgets')) {
    const widgets = JSON.parse(
      readFileSync('.temp/widgets-webkit-canonical.json', 'utf8')
    )
    const dashboardPath = `/dashboard?workspace=${widgets.workspace}`
    await browser.execute(path => {
      history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, dashboardPath)
    await browser
      .$('.monolith-widget-workspace')
      .waitForExist({ timeout: 30000 })
    await browser.$('button=Edit layout').click()
    const tile = await browser.$(
      '.monolith-widget-workspace > .monolith-widget-grid > [data-widget-id]:first-child'
    )
    const id = await tile.getAttribute('data-widget-id')
    const resize = await tile.$('button[aria-label^="Resize "]')
    const beforeHeight = await browser.execute(id => {
      const item = document.querySelector(`[data-widget-id="${id}"]`)
      return parseFloat(item.style.height) || item.offsetHeight
    }, id)
    await resize.click()
    assert.match(
      await browser.execute(() =>
        document.activeElement?.getAttribute('aria-label')
      ),
      /^Resize /
    )
    await browser.keys('ArrowDown')
    const height = await tile.getCSSProperty('height')
    const dimensions = await browser.execute(id => {
      const item = document.querySelector(`[data-widget-id="${id}"]`)
      return { width: item.dataset.width, height: item.style.height }
    }, id)
    assert.ok(parseFloat(height.value) >= 180)
    assert.equal(
      parseFloat(dimensions.height),
      Math.min(1000, beforeHeight + 40),
      'Keyboard resize must change the saved height'
    )
    await browser.waitUntil(
      async () =>
        (await browser.$('body').getText()).includes('Saved to server'),
      { timeout: 20000 }
    )
    await browser.$('button=Done').click()
    await browser.saveScreenshot('docs/assets/monolith-widgets-windows.png')
    await browser.reloadSession()
    await browser.waitUntil(
      async () =>
        (await browser.$('body').getText()).includes('Desktop acceptance'),
      { timeout: 30000 }
    )
    await browser.execute(path => {
      history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, dashboardPath)
    await browser.$(`[data-widget-id="${id}"]`).waitForExist({ timeout: 30000 })
    assert.deepEqual(
      await browser.execute(id => {
        const item = document.querySelector(`[data-widget-id="${id}"]`)
        return { width: item.dataset.width, height: item.style.height }
      }, id),
      dimensions
    )
    console.log(
      'Windows WebView2 widgets: connected dashboard, native draft write, resize and persisted app restart passed.'
    )
  }
  console.log(
    'Windows app: HTTPS discovery, secure login, bundled workspace, single editor host passed.'
  )
} catch (error) {
  if (browser) {
    await browser.saveScreenshot('.temp/windows-failure.png')
    writeFileSync(
      '.temp/windows-failure.txt',
      (await browser.$('body').getText()) +
        '\n' +
        JSON.stringify(
          await browser.execute(() => {
            const h = document.querySelector('editor-host')
            return {
              errors: window.__testErrors,
              html: h?.innerHTML,
              root: h?.store?.root?.flavour,
              store: h?.store?.loaded,
              custom: !!customElements.get('affine-paragraph'),
              host: !!customElements.get('editor-host')
            }
          })
        )
    )
  }
  throw error
} finally {
  if (browser) await browser.deleteSession()
  driver.kill()
}
