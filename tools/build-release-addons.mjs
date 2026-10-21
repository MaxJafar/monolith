import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const selected = process.argv.slice(2)
if (
  selected.some(
    id => !/^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
  )
)
  throw Error('Invalid addon ID')
const core = new Set([
  'monolith--databases'
])
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
for (const directory of fs.readdirSync('modules')) {
  if (
    core.has(directory) ||
    (selected.length && !selected.includes(directory)) ||
    !fs.existsSync(`modules/${directory}/package.json`)
  )
    continue
  const pkg = JSON.parse(
    fs.readFileSync(`modules/${directory}/package.json`, 'utf8')
  )
  const result = spawnSync(pnpm, ['--filter', pkg.name, 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, MONOLITH_ADDON_RELEASE: '1' },
    windowsHide: true
  })
  if (result.status !== 0) process.exit(result.status || 1)
}
const result = spawnSync(
  pnpm,
  ['exec', 'tsx', 'tools/release-addons.mts', ...selected],
  { stdio: 'inherit', shell: process.platform === 'win32', windowsHide: true }
)
process.exit(result.status || 0)
