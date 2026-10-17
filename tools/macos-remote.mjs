// Transfer only the native sources and generated frontend to the authorized Mac.
// The SSH alias must be supplied explicitly and host-key verification stays on.
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const host = process.env.MONOLITH_MAC_HOST
if (!host || !/^(?:[a-zA-Z0-9_.-]+@)?[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(host))
  throw Error('Set MONOLITH_MAC_HOST to an authorized SSH host or user@host')
const connection = [
  '-o',
  'BatchMode=yes',
  '-o',
  'StrictHostKeyChecking=yes',
  ...(process.env.MONOLITH_MAC_HOST_KEY_ALIAS
    ? ['-o', `HostKeyAlias=${process.env.MONOLITH_MAC_HOST_KEY_ALIAS}`]
    : []),
  ...(process.env.MONOLITH_MAC_IDENTITY
    ? ['-i', process.env.MONOLITH_MAC_IDENTITY, '-o', 'IdentitiesOnly=yes']
    : [])
]
const run = (tool, args) => {
  const r = spawnSync(tool, args, { stdio: 'inherit', windowsHide: true })
  if (r.error) throw r.error
  if (r.status !== 0) throw Error(`${tool} exited ${r.status}`)
}
mkdirSync('.temp', { recursive: true })
const archive = resolve('.temp/macos-source.tar.gz')
run('tar', [
  '-czf',
  archive,
  '--exclude=.build',
  'apps/desktop-macos',
  'apps/desktop/dist',
  'apps/web/public',
  'packages/ui/src/assets/icons/icon-notices.json',
  'tools/macos-build.mjs',
  'tools/macos-host.package.json',
  'tools/macos-ui.mjs',
  'tools/macos-ui',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md'
])
run('scp', [
  ...connection,
  archive,
  `${host}:Developer/monolith-native/source.tar.gz`
])
const mode = process.argv.includes('--test') ? 'test' : 'build'
run('ssh', [
  ...connection,
  host,
  `cd ~/Developer/monolith-native && test "$(pwd -P)" = "$HOME/Developer/monolith-native" && rm -rf -- apps/desktop/dist && tar -xzf source.tar.gz && cp tools/macos-host.package.json package.json && PATH=/opt/homebrew/bin:$PATH corepack pnpm run ${mode}`
])
