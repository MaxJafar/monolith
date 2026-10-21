// SPDX-License-Identifier: 0BSD
import { join } from 'node:path'
import { inc, valid } from 'semver'

import { objectFile, replaceJSON } from './jsonFile'

export default function bumpPackageVersion(directory: string) {
  const file = join(directory, 'package.json'),
    manifest = objectFile(file),
    oldVersion = manifest.version
  if (typeof oldVersion !== 'string' || !valid(oldVersion))
    throw Error('A valid package version is required before publishing')
  const newVersion = inc(oldVersion, 'patch')
  if (!newVersion) throw Error('Unable to increment package version')
  replaceJSON(file, { ...manifest, version: newVersion })
  return { oldVersion, newVersion }
}
export function revertPackageVersion(directory: string, version: string) {
  if (!valid(version)) throw Error('Cannot restore an invalid package version')
  const file = join(directory, 'package.json')
  replaceJSON(file, { ...objectFile(file), version })
}
