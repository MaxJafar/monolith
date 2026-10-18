import fs from 'node:fs/promises'
import path from 'node:path'

const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'))
const source =
  process.platform === 'win32'
    ? 'apps/desktop/src-tauri/target/release/bundle/nsis'
    : '.temp/macos'
const extension = process.platform === 'win32' ? '.exe' : '.dmg'
const output = path.resolve('dist/platform-releases', `v${version}`)
await fs.mkdir(output, { recursive: true })
const files = (await fs.readdir(source)).filter(file =>
  file.endsWith(extension)
)
if (!files.length) throw Error('Native installer is missing')
for (const file of files)
  await fs.copyFile(path.join(source, file), path.join(output, file))
