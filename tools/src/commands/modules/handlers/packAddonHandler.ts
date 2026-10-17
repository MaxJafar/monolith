import { addonStorageId } from '@monolith/configs'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

export function packAddonHandler(id: string) {
  if (!/^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$/.test(id))
    throw Error('Use the addon directory name, such as yourname--reading-list')

  const directory = path.resolve(ROOT_DIR, 'modules', id)

  if (fs.lstatSync(directory).isSymbolicLink())
    throw Error('Package a real addon directory, not a symlink')

  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8')
  )

  if (
    addonStorageId(manifest.name) !== id ||
    !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(manifest.version)
  )
    throw Error('Addon identity or version is invalid')

  const entries = [
    'package.json',
    'client',
    'server',
    'locales',
    'README.md',
    'LICENSE'
  ].filter(file => fs.existsSync(path.join(directory, file)))
  // Allowlisted trees only; never include keys, environment files, local data or symlinks.
  const check = (folder: string) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      if (entry.isSymbolicLink())
        throw Error('Remove symlinks before packaging an addon')
      if (entry.isDirectory()) check(path.join(folder, entry.name))
    }
  }

  for (const entry of entries) {
    const stat = fs.lstatSync(path.join(directory, entry))

    if (stat.isSymbolicLink())
      throw Error('Remove symlinks before packaging an addon')
    if (stat.isDirectory()) check(path.join(directory, entry))
  }

  const output = path.resolve(
    ROOT_DIR,
    'dist',
    'addons',
    `${id}-${manifest.version}.tar.gz`
  )
  fs.mkdirSync(path.dirname(output), { recursive: true })
  if (fs.existsSync(output)) throw Error(`Archive already exists: ${output}`)

  const result = spawnSync(
    'tar',
    [
      '-czf',
      output,
      '--exclude=node_modules',
      '--exclude=.*',
      '--exclude=*.pem',
      '--exclude=*.key',
      '--exclude=*.p12',
      '--exclude=*.tsbuildinfo',
      '--exclude=coverage',
      '--exclude=uploads',
      '-C',
      directory,
      ...entries
    ],
    { stdio: 'inherit', windowsHide: true }
  )

  if (result.error || result.status !== 0)
    throw result.error ?? Error('Addon packaging failed')
  console.info(
    `Created ${output}. Review the archive before uploading it to your own repository or release. A community shop is not required.`
  )
}
