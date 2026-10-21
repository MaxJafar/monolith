// SPDX-License-Identifier: 0BSD
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export type LocaleIssue = {
  file: string
  kind:
    'missing-file' | 'extra-file' | 'missing-keys' | 'extra-keys' | 'invalid'
  keys?: string[]
  detail?: string
}
function leafKeys(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('A locale file must contain a JSON object')
  const pending: [string, unknown][] = [['', value]],
    keys: string[] = []
  while (pending.length) {
    const [prefix, current] = pending.pop()!
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      for (const key of Object.keys(current))
        pending.push([
          prefix ? prefix + '.' + key : key,
          (current as Record<string, unknown>)[key]
        ])
    } else keys.push(prefix)
  }
  return new Set(keys)
}
export function inspectLocales(
  directory: string,
  reference = 'lang-en'
): LocaleIssue[] {
  const issues: LocaleIssue[] = []
  function files(folder: string) {
    return readdirSync(folder, { withFileTypes: true })
      .filter(
        item =>
          item.isFile() &&
          item.name.endsWith('.json') &&
          item.name !== 'package.json'
      )
      .map(item => item.name)
      .sort()
  }
  function read(folder: string, file: string) {
    try {
      return leafKeys(
        JSON.parse(readFileSync(join(directory, folder, file), 'utf8'))
      )
    } catch (error) {
      issues.push({
        file: folder + '/' + file,
        kind: 'invalid',
        detail: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }
  try {
    const expected = files(join(directory, reference)),
      names = readdirSync(directory, { withFileTypes: true })
        .filter(
          item =>
            item.isDirectory() &&
            item.name.startsWith('lang-') &&
            item.name !== reference
        )
        .map(item => item.name)
        .sort()
    const baseline = new Map(
      expected.map(file => [file, read(reference, file)])
    )
    for (const name of names) {
      const available = new Set(files(join(directory, name)))
      for (const file of expected) {
        const relative = name + '/' + file
        if (!available.has(file)) {
          issues.push({ file: relative, kind: 'missing-file' })
          continue
        }
        available.delete(file)
        const actual = read(name, file),
          original = baseline.get(file)
        if (!actual || !original) continue
        const missing = [...original].filter(key => !actual.has(key)).sort(),
          extra = [...actual].filter(key => !original.has(key)).sort()
        if (missing.length)
          issues.push({ file: relative, kind: 'missing-keys', keys: missing })
        if (extra.length)
          issues.push({ file: relative, kind: 'extra-keys', keys: extra })
      }
      for (const file of available)
        issues.push({ file: name + '/' + file, kind: 'extra-file' })
    }
  } catch (error) {
    issues.push({
      file: directory,
      kind: 'invalid',
      detail: error instanceof Error ? error.message : String(error)
    })
  }
  return issues
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const issues = inspectLocales(resolve(import.meta.dirname, '../locales'))
  for (const issue of issues)
    console.error(
      [issue.kind, issue.file, issue.detail, ...(issue.keys ?? [])]
        .filter(Boolean)
        .join(' · ')
    )
  if (issues.length) {
    console.error(issues.length + ' locale consistency issue(s).')
    process.exitCode = 1
  } else console.log('Locale keys and files match the English reference.')
}
