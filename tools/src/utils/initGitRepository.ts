// SPDX-License-Identifier: 0BSD
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { runProcess } from './commands'
import { readRepoUrl } from './github/repo'

export default function initGitRepository(directory: string) {
  if (existsSync(join(directory, '.git'))) return
  const remote = readRepoUrl(directory)
  runProcess('git', ['init', '--initial-branch=main'], { cwd: directory })
  if (remote)
    runProcess('git', ['remote', 'add', 'origin', remote], { cwd: directory })
  // Keep downloaded source uncommitted so its original revision remains explicit in the lockfile.
}
