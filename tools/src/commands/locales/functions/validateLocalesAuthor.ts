import { log } from '@clack/prompts'
import fs from 'fs'
import path from 'path'

import { getGithubLogin, validateMaintainerAccess } from '@/utils/github'

export default async function validateLocalesAuthor(modulePath: string) {
  const username = getGithubLogin()

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8')
  )

  const nameWithoutScope = packageJson.name.replace('@monolith/', '')

  const usernamePrefix = nameWithoutScope.includes('--') ? nameWithoutScope.split('--')[0] : 'monolith'

  if (usernamePrefix && usernamePrefix !== username) {
    if (usernamePrefix === 'monolith') {
      validateMaintainerAccess(username)
    } else {
      log.error(
        `Cannot publish as "${username}" - package belongs to "${usernamePrefix}". You can only publish packages starting with @monolith/${username}--`
      )
      process.exit(1)
    }
  }
}
