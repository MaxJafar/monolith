import { readdir, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, relative, dirname, join, sep } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const files = await readdir(root, { recursive: true })
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const pages = new Map()
for (const file of htmlFiles)
  pages.set(resolve(root, file), await readFile(resolve(root, file), 'utf8'))
const failures = []
const titles = new Set()
let links = 0
for (const [path, html] of pages) {
  const label = relative(root, path)
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1]
  if (!title || titles.has(title))
    failures.push(`${label}: missing or duplicate title`)
  titles.add(title)
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1)
    failures.push(`${label}: expected one h1`)
  if (!/<meta name="description" content="[^"]+"/.test(html))
    failures.push(`${label}: missing description`)
  if (!/<link rel="canonical" href="https:\/\//.test(html))
    failures.push(`${label}: missing canonical`)
  if (!html.includes('property="og:image"'))
    failures.push(`${label}: missing social preview`)
  if (!html.includes('name="viewport"'))
    failures.push(`${label}: missing viewport`)
  for (const match of html.matchAll(
    /<(?:a|img|script|link)\b[^>]*\b(?:href|src)="([^"]+)"/g
  )) {
    const href = match[1].replaceAll('&amp;', '&')
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue
    if (!href) {
      failures.push(`${label}: empty link`)
      continue
    }
    const [pathname, fragment] = href.split('#')
    const clean = decodeURIComponent(pathname.split('?')[0])
    let destination = clean
      ? resolve(
          clean.startsWith('/') ? root : dirname(path),
          `.${clean.startsWith('/') ? clean : `/${clean}`}`
        )
      : path
    if (destination !== root && !destination.startsWith(root + sep)) {
      failures.push(`${label}: link leaves output ${href}`)
      continue
    }
    let info
    try {
      info = await stat(destination)
    } catch {
      /* Try a clean URL. */
    }
    if (!info || info.isDirectory())
      destination = join(destination, 'index.html')
    try {
      await stat(destination)
    } catch {
      failures.push(`${label}: broken local link ${href}`)
      continue
    }
    if (
      fragment &&
      pages.has(destination) &&
      !pages.get(destination).includes(`id="${decodeURIComponent(fragment)}"`)
    )
      failures.push(`${label}: broken fragment ${href}`)
    links++
  }
}
const search = JSON.parse(await readFile(join(root, 'search.json'), 'utf8'))
assert(search.length >= 20, 'Documentation index is incomplete')
for (const entry of search) {
  assert(
    entry.title &&
      entry.description &&
      entry.body &&
      entry.url.startsWith('/docs/'),
    'Malformed search entry'
  )
  assert(
    pages.has(resolve(root, `.${entry.url}/index.html`)),
    `Missing search destination: ${entry.url}`
  )
}
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8')
assert(!sitemap.includes('/404'), '404 must not be in the sitemap')
assert(
  (sitemap.match(/<url>/g) || []).length === htmlFiles.length - 1,
  'Sitemap does not cover public pages'
)
assert(
  (await readFile(join(root, 'robots.txt'), 'utf8')).includes(
    'Sitemap: https://'
  ),
  'Robots sitemap missing'
)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else
  console.log(
    `Verified ${htmlFiles.length} pages, ${links} local links/assets, ${search.length} searchable guides, unique metadata and the sitemap.`
  )
