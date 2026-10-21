// SPDX-License-Identifier: 0BSD
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extract } from 'tar'

import { parseRepoSlug } from './repo'

export async function downloadArchive(
  repo: string,
  ref: string,
  destination: string
) {
  const slug = parseRepoSlug(repo)
  if (!slug || !/^[a-f\d]{40}$/i.test(ref))
    throw Error('Archives require a repository and full commit SHA')
  const folder = await mkdtemp(join(tmpdir(), 'monolith-archive-')),
    file = join(folder, 'source.tgz')
  try {
    const reply = await fetch(
      'https://codeload.github.com/' + slug + '/tar.gz/' + ref,
      { signal: AbortSignal.timeout(120000) }
    )
    if (!reply.ok || !reply.body)
      throw Error('Archive download failed: ' + reply.status)
    const chunks: Uint8Array[] = []
    let length = 0
    for await (const chunk of reply.body as unknown as AsyncIterable<Uint8Array>) {
      length += chunk.length
      if (length > 128 * 1024 * 1024) throw Error('Archive exceeds 128 MiB')
      chunks.push(chunk)
    }
    await writeFile(file, Buffer.concat(chunks))
    await mkdir(destination, { recursive: true })
    await extract({
      file,
      cwd: destination,
      strip: 1,
      strict: true,
      preservePaths: false,
      filter: (name, entry) => {
        const segments = name.replaceAll('\\', '/').split('/')
        if (
          segments.includes('..') ||
          name.startsWith('/') ||
          /^[a-z]:/i.test(name) ||
          ('type' in entry &&
            ![
              'File',
              'Directory',
              'OldFile',
              'ExtendedHeader',
              'GlobalExtendedHeader'
            ].includes(entry.type))
        )
          throw Error('Unsafe archive entry')
        return !segments.some(
          part => part === '.git' || part === 'node_modules'
        )
      }
    })
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}
