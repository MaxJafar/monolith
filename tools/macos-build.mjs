import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { resolve, sep } from 'node:path'

if (process.platform !== 'darwin')
  throw Error('Run this pnpm script on the authorized Mac build host')
const run = (tool, args) => {
  const r = spawnSync(tool, args, { stdio: 'inherit', env: process.env })
  if (r.error) throw r.error
  if (r.status !== 0) throw Error(`${tool} exited ${r.status}`)
}
const project = resolve('apps/desktop-macos')
if (process.argv.includes('--test')) {
  run('swift', ['test', '--package-path', project])
  process.exit(0)
}
for (const arch of ['arm64', 'x86_64'])
  run('swift', [
    'build',
    '--package-path',
    project,
    '--configuration',
    'release',
    '--arch',
    arch
  ])
const output = resolve('.temp/macos'),
  app = resolve(output, 'Monolith.app'),
  contents = resolve(app, 'Contents'),
  resources = resolve(contents, 'Resources')
// Only remove our generated app bundles, so old hashed frontend assets cannot
// survive an incremental packaging run.
for (const generated of [app, resolve(output, 'installer/Monolith.app')]) {
  if (!generated.startsWith(output + sep)) throw Error('Invalid build output')
  rmSync(generated, { recursive: true, force: true })
}
mkdirSync(resolve(contents, 'MacOS'), { recursive: true })
mkdirSync(resources, { recursive: true })
run('lipo', [
  '-create',
  resolve(project, '.build/arm64-apple-macosx/release/Monolith'),
  resolve(project, '.build/x86_64-apple-macosx/release/Monolith'),
  '-output',
  resolve(contents, 'MacOS/Monolith')
])
copyFileSync(resolve(project, 'Info.plist'), resolve(contents, 'Info.plist'))
cpSync(resolve('apps/desktop/dist'), resolve(resources, 'web'), {
  recursive: true
})
copyFileSync(resolve('LICENSE'), resolve(resources, 'LICENSE'))
copyFileSync(
  resolve('packages/ui/src/assets/icons/icon-notices.json'),
  resolve(resources, 'icon-notices.json')
)
if (existsSync('THIRD_PARTY_NOTICES.md'))
  copyFileSync(
    resolve('THIRD_PARTY_NOTICES.md'),
    resolve(resources, 'THIRD_PARTY_NOTICES.md')
  )
const png = resolve('apps/web/public/brand/monolith-512.png')
if (existsSync(png)) {
  const iconset = resolve(output, 'Monolith.iconset')
  mkdirSync(iconset, { recursive: true })
  for (const size of [16, 32, 128, 256, 512])
    for (const scale of [1, 2])
      run('sips', [
        '-z',
        String(size * scale),
        String(size * scale),
        png,
        '--out',
        resolve(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)
      ])
  run('iconutil', [
    '-c',
    'icns',
    iconset,
    '-o',
    resolve(resources, 'Monolith.icns')
  ])
}
const identity = process.env.MACOS_SIGN_IDENTITY || '-'
run(process.execPath, ['tools/build-updater.mjs', 'darwin-universal'])
const updaterResources = resolve(resources, 'updater')
mkdirSync(updaterResources, { recursive: true })
for (const file of ['monolith-updater', 'settings.json'])
  copyFileSync(
    resolve('.temp/updaters/darwin-universal', file),
    resolve(updaterResources, file)
  )
run('codesign', [
  '--force',
  '--options',
  'runtime',
  '--sign',
  identity,
  ...(identity === '-' ? [] : ['--timestamp']),
  resolve(updaterResources, 'monolith-updater')
])
run('codesign', [
  '--force',
  '--options',
  'runtime',
  '--entitlements',
  resolve(project, 'entitlements.plist'),
  '--sign',
  identity,
  ...(identity === '-' ? [] : ['--timestamp']),
  app
])
run('codesign', ['--verify', '--deep', '--strict', app])
const stage = resolve(output, 'installer')
const releaseVersion = JSON.parse(
  readFileSync('apps/desktop/src-tauri/tauri.conf.json', 'utf8')
).version
const dmg = resolve(output, `Monolith-${releaseVersion}-universal.dmg`)
mkdirSync(stage, { recursive: true })
cpSync(app, resolve(stage, 'Monolith.app'), { recursive: true })
if (!existsSync(resolve(stage, 'Applications')))
  symlinkSync('/Applications', resolve(stage, 'Applications'))
run('hdiutil', [
  'create',
  '-ov',
  '-volname',
  'Monolith',
  '-srcfolder',
  stage,
  '-format',
  'UDZO',
  dmg
])
if (identity !== '-') run('codesign', ['--sign', identity, '--timestamp', dmg])
if (process.env.MACOS_NOTARY_PROFILE) {
  run('xcrun', [
    'notarytool',
    'submit',
    dmg,
    '--keychain-profile',
    process.env.MACOS_NOTARY_PROFILE,
    '--wait'
  ])
  run('xcrun', ['stapler', 'staple', dmg])
  run('xcrun', ['stapler', 'staple', app])
}
console.log(
  identity === '-'
    ? 'Universal development DMG built with ad-hoc signing. Developer ID and notarization are release prerequisites.'
    : 'Signed universal DMG built.'
)
