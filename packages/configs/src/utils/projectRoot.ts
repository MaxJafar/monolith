// SPDX-License-Identifier: 0BSD
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export function findProjectRoot(startDir?: string): string {
  const checked = new Set<string>()
  for (const candidate of [
    process.env.ROOT_DIR,
    startDir,
    process.cwd(),
    import.meta.dirname
  ]) {
    if (!candidate) continue
    let directory = resolve(candidate)
    while (!checked.has(directory)) {
      checked.add(directory)
      if (
        ['pnpm-workspace.yaml', 'pnpm-lock.yaml', '.git'].some(marker =>
          existsSync(join(directory, marker))
        )
      )
        return directory
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  return process.cwd()
}
