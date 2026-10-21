// SPDX-License-Identifier: 0BSD
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runProcess } from '../commands'
import { ghApi } from './cli'
import { registryConfig } from './registryConfig'

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok)
    throw Error('Registry request returned HTTP ' + response.status)
  return (await response.json()) as T
}
export function rawRegistryUrl(file: string) {
  if (file.split('/').some(part => !part || part === '..'))
    throw Error('Invalid registry file')
  const { repo, ref } = registryConfig()
  return (
    'https://raw.githubusercontent.com/' +
    repo +
    '/' +
    encodeURIComponent(ref) +
    '/' +
    file.split('/').map(encodeURIComponent).join('/')
  )
}
export function updateRegistryIndex(
  kind: 'modules' | 'locales',
  entry: { id: string; repo: string; version: string; commitSha: string }
) {
  const { repo, ref } = registryConfig(),
    endpoint = 'repos/' + repo + '/contents/' + kind + '.json'
  const current = ghApi<{ sha: string; content: string }>(
    endpoint + '?ref=' + encodeURIComponent(ref)
  )
  const records = JSON.parse(
    Buffer.from(current.content, 'base64').toString()
  ) as {
    id: string
    repo: string
    latest: string
    versions: Record<string, string>
  }[]
  if (!Array.isArray(records)) throw Error('Registry index must be an array')
  const prior = records.find(row => row.id === entry.id)
  const item = {
    id: entry.id,
    repo: entry.repo,
    latest: entry.version,
    versions: { ...prior?.versions, [entry.version]: entry.commitSha }
  }
  const next = records
    .filter(row => row.id !== entry.id)
    .concat(item)
    .sort((a, b) => a.id.localeCompare(b.id))
  const folder = mkdtempSync(join(tmpdir(), 'monolith-publish-'))
  try {
    const file = join(folder, 'request.json')
    writeFileSync(
      file,
      JSON.stringify({
        message: 'Publish ' + entry.id + ' ' + entry.version,
        branch: ref,
        sha: current.sha,
        content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString(
          'base64'
        )
      })
    )
    runProcess('gh', ['api', '--method', 'PUT', endpoint, '--input', file])
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}
