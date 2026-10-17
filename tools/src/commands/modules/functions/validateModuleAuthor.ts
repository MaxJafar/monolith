import { log } from '@clack/prompts'
import fs from 'fs'
import path from 'path'
import z from 'zod'

import { getGithubLogin, validateMaintainerAccess } from '@/utils/github'

import { packageJSONSchema } from './packageJSONSchema'

export default async function validateModuleAuthor(modulePath: string) {
  const username = getGithubLogin()

  const packageJson = z.safeParse(
    packageJSONSchema,
    JSON.parse(fs.readFileSync(path.join(modulePath, 'package.json'), 'utf-8'))
  )

  if (!packageJson.success) {
    log.error(
      'Invalid package.json. Please refer to the documentation for the correct format.'
    )
    process.exit(1)
  }

  const nameWithoutScope = packageJson.data.name.replace('@monolith/', '')

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
