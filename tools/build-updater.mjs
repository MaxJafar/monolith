import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target =
  process.argv[2] ||
  (process.platform === 'darwin'
    ? 'darwin-universal'
    : process.platform === 'win32'
      ? 'windows-amd64'
      : `linux-${process.arch === 'arm64' ? 'arm64' : 'amd64'}`)
if (
  !['windows-amd64', 'darwin-universal', 'linux-amd64', 'linux-arm64'].includes(
    target
  )
)
  throw Error('Unsupported updater target')
const root = resolve(import.meta.dirname, '..')
const output =
  target === 'windows-amd64'
    ? resolve(root, 'apps/desktop/src-tauri/updater')
    : resolve(root, '.temp/updaters', target)
mkdirSync(output, { recursive: true })
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: root,
    env,
    windowsHide: true
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw Error(`${command} exited ${result.status}`)
}
const build = (os, arch, file) =>
  run(
    process.execPath,
    [
      'tools/native-toolchain.mjs',
      'go',
      'build',
      '-trimpath',
      '-ldflags=-s -w',
      '-o',
      file,
      './cmd/updater'
    ],
    { ...process.env, GOOS: os, GOARCH: arch, CGO_ENABLED: '0' }
  )
if (target === 'darwin-universal') {
  if (process.platform !== 'darwin')
    throw Error('Universal macOS helpers must be assembled on a Mac')
  for (const arch of ['amd64', 'arm64'])
    build('darwin', arch, resolve(output, `updater-${arch}`))
  run('lipo', [
    '-create',
    resolve(output, 'updater-amd64'),
    resolve(output, 'updater-arm64'),
    '-output',
    resolve(output, 'monolith-updater')
  ])
} else {
  const [os, arch] = target.split('-')
  build(
    os,
    arch,
    resolve(output, `monolith-updater${os === 'windows' ? '.exe' : ''}`)
  )
}
const rootPackage = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8')
)
const nativeVersion = JSON.parse(
  readFileSync(resolve(root, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8')
).version
if (target === 'windows-amd64' || target === 'darwin-universal')
  writeFileSync(
    resolve(output, 'settings.json'),
    JSON.stringify(
      {
        repository:
          process.env.GITHUB_REPOSITORY ||
          rootPackage.repository.url
            .replace('https://github.com/', '')
            .replace(/\.git$/, ''),
        publicKey: process.env.MONOLITH_RELEASE_PUBLIC_KEY || '',
        version: nativeVersion,
        target,
        protocol: 1,
        ...(target === 'darwin-universal'
          ? {
              macTeamId: process.env.MACOS_TEAM_ID || '',
              macAllowAdHoc: process.env.MONOLITH_UNSIGNED_INSTALLERS === '1'
            }
          : {})
      },
      null,
      2
    ) + '\n'
  )
console.log(`Prepared ${target} update supervisor`)
