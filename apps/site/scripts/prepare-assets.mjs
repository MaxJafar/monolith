import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../../', import.meta.url)
const publicDir = new URL('../public/', import.meta.url)
const fromRoot = (path) => fileURLToPath(new URL(path, root))
const target = (path) => fileURLToPath(new URL(path, publicDir))
const sharp = createRequire(new URL('apps/api/package.json', root))('sharp')

await mkdir(target('images'), { recursive: true })
await mkdir(target('fonts'), { recursive: true })
await copyFile(
  fromRoot('apps/web/public/brand/monolith-mark.svg'),
  target('icon.svg')
)
for (const file of [
  'InterVariable.woff2',
  'JetBrainsMono-Regular.woff2',
  'Inter-OFL.txt',
  'JetBrainsMono-OFL.txt'
]) {
  await copyFile(
    fromRoot(`apps/web/public/fonts/${file}`),
    target(`fonts/${file}`)
  )
}
const screenshots = {
  workspace: 'monolith-widgets-chromium-canonical.png',
  documents: 'monolith-inline-databases.png',
  projects: 'monolith-board-desktop.png',
  atlas: 'monolith-atlas-context.png',
  addons: 'addons-shop.png',
  widgets: 'widget-settings.png'
}
for (const [name, source] of Object.entries(screenshots)) {
  await sharp(fromRoot(`docs/assets/${source}`))
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(target(`images/${name}.webp`))
}
await sharp(fromRoot('docs/assets/monolith-cover.svg'))
  .resize(1200, 630, { fit: 'contain', background: '#f7f7f5' })
  .png()
  .toFile(target('social.png'))
console.log(
  'Prepared shared Monolith mark, licensed fonts and six product screenshots.'
)
