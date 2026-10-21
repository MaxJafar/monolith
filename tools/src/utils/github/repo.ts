// SPDX-License-Identifier: 0BSD
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ghApi } from './cli'

export function readRepoUrl(directory: string): string | undefined {
  try {
    const value = JSON.parse(
      readFileSync(join(directory, 'package.json'), 'utf8')
    ).repository
    return typeof value === 'string' ? value : value?.url
  } catch {
    return undefined
  }
}
export function parseRepoSlug(input: string): string | undefined {
  let value = input
    .trim()
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
  if (value.startsWith('git@github.com:')) value = value.slice(15)
  else if (value.includes('://')) {
    try {
      const url = new URL(value)
      if (url.hostname !== 'github.com') return
      value = url.pathname.slice(1)
    } catch {
      return
    }
  }
  return /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value)
    ? value
    : undefined
}
export function readRepoSlug(directory: string) {
  const url = readRepoUrl(directory)
  return url ? parseRepoSlug(url) : undefined
}
export function getRepoSlug(directory: string) {
  const slug = readRepoSlug(directory)
  if (!slug)
    throw Error(
      'A GitHub repository is required in ' + directory + '/package.json'
    )
  return slug
}
export function getTagCommit(repo: string, ref: string) {
  const slug = parseRepoSlug(repo)
  if (!slug) throw Error('Invalid repository')
  return ghApi<{ sha: string }>(
    'repos/' + slug + '/commits/' + encodeURIComponent(ref)
  ).sha
}
