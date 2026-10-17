import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const version = (process.argv[2] || process.env.GITHUB_REF_NAME || '').replace(
  /^v/,
  ''
)
if (
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-zA-Z0-9.-]+)?$/.test(
    version
  )
)
  throw Error('Pass a release version, for example 1.0.0 or 1.1.0-beta.1')
for (const file of [
  'package.json',
  'apps/web/package.json',
  'apps/api/package.json',
  'apps/desktop/package.json',
  'packages/agent-tools/package.json',
  'apps/desktop/src-tauri/tauri.conf.json'
]) {
  const target = path.join(root, file),
    value = JSON.parse(await fs.readFile(target, 'utf8'))
  value.version = version
  await fs.writeFile(target, JSON.stringify(value, null, 2) + '\n')
}
const cargo = path.join(root, 'apps/desktop/src-tauri/Cargo.toml')
await fs.writeFile(
  cargo,
  (await fs.readFile(cargo, 'utf8')).replace(
    /(\[package\][\s\S]*?\nversion = ")[^"]+"/,
    (_, prefix) => `${prefix}${version}"`
  )
)
const lock = path.join(root, 'apps/desktop/src-tauri/Cargo.lock')
await fs.writeFile(
  lock,
  (await fs.readFile(lock, 'utf8')).replace(
    /(name = "monolith-desktop"\r?\nversion = ")[^"]+"/,
    (_, prefix) => `${prefix}${version}"`
  )
)
const plist = path.join(root, 'apps/desktop-macos/Info.plist')
await fs.writeFile(
  plist,
  (await fs.readFile(plist, 'utf8'))
    .replace(
      /(<key>CFBundleShortVersionString<\/key><string>)[^<]+/,
      (_, prefix) => prefix + version.split('-')[0]
    )
    .replace(
      /(<key>MonolithReleaseVersion<\/key><string>)[^<]+/,
      (_, prefix) => prefix + version
    )
    .replace(
      /(<key>CFBundleVersion<\/key><string>)[^<]+/,
      (_, prefix) => prefix + version.split('-')[0]
    )
)
console.log(
  `Aligned web, API, agent tools, Windows and macOS release metadata to ${version}`
)
