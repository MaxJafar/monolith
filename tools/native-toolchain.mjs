import { config } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: resolve(root, 'env/.env.local'), quiet: true })
const [tool, ...args] = process.argv.slice(2)
let executable = tool
let cwd = root
if (tool === 'go') {
  const version = 'go1.27.2'
  const os = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[
    process.platform
  ]
  const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch]
  if (!os || !arch) throw Error('Unsupported Go build host')
  const directory = resolve(root, '.temp/toolchains', version)
  executable = resolve(directory, 'go/bin', os === 'windows' ? 'go.exe' : 'go')
  const marker = resolve(directory, 'verified.sha256')
  if (!existsSync(executable) || !existsSync(marker)) {
    const releases = await (
      await fetch('https://go.dev/dl/?mode=json&include=all')
    ).json()
    const release = releases.find(item => item.version === version)
    const archive = release?.files.find(
      file => file.os === os && file.arch === arch && file.kind === 'archive'
    )
    if (!archive) throw Error('Pinned Go archive unavailable')
    const path = resolve(directory, archive.filename)
    const response = existsSync(path)
      ? null
      : await fetch(`https://go.dev/dl/${archive.filename}`)
    if (response && !response.ok)
      throw Error(`Go download failed: ${response.status}`)
    const bytes = response
      ? Buffer.from(await response.arrayBuffer())
      : readFileSync(path)
    if (createHash('sha256').update(bytes).digest('hex') !== archive.sha256)
      throw Error('Go archive checksum mismatch')
    mkdirSync(directory, { recursive: true })
    writeFileSync(path, bytes)
    const extracted =
      os === 'windows'
        ? spawnSync(
            'pwsh',
            [
              '-NoProfile',
              '-NonInteractive',
              '-Command',
              '$ErrorActionPreference="Stop"; [IO.Compression.ZipFile]::ExtractToDirectory($env:MONOLITH_GO_ARCHIVE, $env:MONOLITH_GO_DIRECTORY, $true)'
            ],
            {
              stdio: 'inherit',
              windowsHide: true,
              env: {
                ...process.env,
                MONOLITH_GO_ARCHIVE: path,
                MONOLITH_GO_DIRECTORY: directory
              }
            }
          )
        : spawnSync('tar', ['-xf', path, '-C', directory], {
            stdio: 'inherit',
            windowsHide: true
          })
    if (extracted.status !== 0) throw Error('Go extraction failed')
    writeFileSync(marker, archive.sha256)
    console.log(`Verified and installed ${version} in the workspace tool cache`)
  }
  cwd = resolve(root, 'apps/gateway')
} else if (
  ![
    'cargo',
    'docker',
    'tailscale',
    'xcodebuild',
    'swift',
    'codesign',
    'hdiutil',
    'xcrun'
  ].includes(tool)
) {
  throw Error('Unsupported native toolchain')
}
const result = spawnSync(executable, args, {
  cwd,
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, GOTOOLCHAIN: 'local' }
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
