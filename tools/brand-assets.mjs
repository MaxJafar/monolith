import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const requireAPI = createRequire(
  new URL('../apps/api/package.json', import.meta.url)
)
const sharp = requireAPI('sharp')
const path = name => fileURLToPath(new URL(`../${name}`, import.meta.url))
const source = readFileSync(path('apps/web/public/brand/monolith-mark.svg'))

// Keep every public SVG identical, including the legacy inverse-logo path.
for (const target of [
  'apps/web/public/icon.svg',
  'apps/web/public/brand/monolith-mark-inverse.svg'
]) {
  writeFileSync(path(target), source)
}

const raster = size =>
  sharp(source, { density: 1536 }).resize(size, size).png().toBuffer()

for (const size of [180, 192, 512]) {
  writeFileSync(
    path(`apps/web/public/brand/monolith-${size}.png`),
    await raster(size)
  )
}

for (const size of [72, 96, 128, 144, 152, 192, 256, 512, 1024]) {
  writeFileSync(
    path(`apps/web/public/assets/icons/icon-${size}x${size}.png`),
    await raster(size)
  )
}

// PNG-backed ICO entries support browser favicons and Windows desktop packaging.
const sizes = [16, 24, 32, 48, 64, 128, 256]
const images = await Promise.all(sizes.map(raster))
const header = Buffer.alloc(6 + sizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)

let offset = header.length

for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16
  header[entry] = size === 256 ? 0 : size
  header[entry + 1] = size === 256 ? 0 : size
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(images[index].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += images[index].length
}
writeFileSync(
  path('apps/web/public/favicon.ico'),
  Buffer.concat([header, ...images])
)

console.log(
  'Generated Monolith SVG, app icons and favicon from the shared mark.'
)
