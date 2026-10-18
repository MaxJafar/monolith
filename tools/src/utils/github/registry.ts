import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ghApi, run } from './cli'
import { registryConfig } from './registryConfig'

/**
 * The GitHub repo that hosts the static module/locale index.
 */
/** Fetches and parses JSON from a URL. */
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return (await response.json()) as T
}

/** URL of a file in the registry index repo (raw). */
export function rawRegistryUrl(file: string): string {
  const { repo, ref } = registryConfig()
  return `https://raw.githubusercontent.com/${repo}/${ref}/${file}`
}

/**
 * Adds/updates an entry in the GitHub-hosted index (`modules.json`/`locales.json`)
 * for the published version, mapping it to the release commit SHA.
 */
export function updateRegistryIndex(
  kind: 'modules' | 'locales',
  entry: { id: string; repo: string; version: string; commitSha: string }
): void {
  const { repo, ref } = registryConfig()
  const file = `${kind}.json`

  const existing = ghApi<{ content: string; sha: string }>(
    `repos/${repo}/contents/${file}?ref=${encodeURIComponent(ref)}`
  )

  const list = JSON.parse(
    Buffer.from(existing.content, 'base64').toString('utf-8')
  ) as Array<{
    id: string
    repo: string
    latest: string
    versions: Record<string, string>
  }>

  const index = list.findIndex(item => item.id === entry.id)
  const previous = index >= 0 ? list[index] : undefined

  const merged = {
    id: entry.id,
    repo: entry.repo,
    latest: entry.version,
    versions: {
      ...(previous?.versions ?? {}),
      [entry.version]: entry.commitSha
    }
  }

  if (index >= 0) {
    list[index] = merged
  } else {
    list.push(merged)
  }

  const content = Buffer.from(JSON.stringify(list, null, 2) + '\n').toString(
    'base64'
  )

  const bodyFile = path.join(os.tmpdir(), `monolith-index-${Date.now()}.json`)

  fs.writeFileSync(
    bodyFile,
    JSON.stringify({
      message: `chore: index ${kind}/${entry.id}@${entry.version}`,
      content,
      branch: ref,
      sha: existing.sha
    })
  )

  try {
    run(`gh api -X PUT repos/${repo}/contents/${file} --input "${bodyFile}"`)
  } finally {
    fs.rmSync(bodyFile, { force: true })
  }
}
