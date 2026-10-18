import { addonPackageName } from '@monolith/configs'
import fs from 'node:fs'
import path from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

/** Resolve installed packages by manifest; folder names are durable storage IDs. */
export default function normalizePackage(
  packageName: string,
  type: 'module' | 'locale' = 'module'
) {
  if (!/^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(packageName))
    throw new Error(
      'Use an addon or locale package name, not a filesystem path'
    )
  const directory = path.join(
    ROOT_DIR,
    type === 'module' ? 'modules' : 'locales'
  )
  const fullName = addonPackageName(
    packageName.startsWith('@') ? packageName : '@monolith/' + packageName
  )
  for (const entry of fs.existsSync(directory)
    ? fs.readdirSync(directory)
    : []) {
    const manifestPath = path.join(directory, entry, 'package.json')
    if (!fs.existsSync(manifestPath)) continue
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (
      manifest.name === fullName ||
      entry === packageName ||
      manifest.monolith?.id === packageName
    )
      return {
        fullName: manifest.name as string,
        shortName: entry,
        targetDir: path.join(directory, entry)
      }
  }
  const shortName = fullName.replace(/^@[^/]+\//, '')
  return { fullName, shortName, targetDir: path.join(directory, shortName) }
}
