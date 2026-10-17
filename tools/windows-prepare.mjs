import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

if (process.platform !== 'win32') throw Error('Windows host required')
const version = process.env.WEBVIEW2_VERSION || '155.0.4283.45'
const directory = resolve('.temp/toolchains/edgedriver', version)
const driver = resolve(directory, 'msedgedriver.exe')
if (!existsSync(driver)) {
  mkdirSync(directory, { recursive: true })
  const response = await fetch(
    `https://msedgedriver.microsoft.com/${version}/edgedriver_win64.zip`
  )
  if (!response.ok)
    throw Error(`Microsoft Edge WebDriver download: ${response.status}`)
  const archive = resolve(directory, 'driver.zip')
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  const result = spawnSync(
    'pwsh',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '[IO.Compression.ZipFile]::ExtractToDirectory($env:MONOLITH_DRIVER_ARCHIVE,$env:MONOLITH_DRIVER_DIRECTORY,$true)'
    ],
    {
      windowsHide: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        MONOLITH_DRIVER_ARCHIVE: archive,
        MONOLITH_DRIVER_DIRECTORY: directory
      }
    }
  )
  if (result.status !== 0) throw Error('Edge WebDriver extraction failed')
}
if (process.argv.includes('--install')) {
  const installer = resolve(
    `apps/desktop/src-tauri/target/${process.argv.includes('--debug') ? 'debug' : 'release'}/bundle/nsis/Monolith_0.1.0_x64-setup.exe`
  )
  if (!existsSync(installer))
    throw Error('Build the matching Windows installer before installing it.')
  const result = spawnSync(installer, ['/S'], {
    windowsHide: true,
    stdio: 'inherit'
  })
  if (result.status !== 0) throw Error(`Installer exited ${result.status}`)
  console.log('Installed per-user Monolith development build.')
}
console.log(`Edge WebDriver ${version} ready.`)
