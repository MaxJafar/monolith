import { log } from '@clack/prompts'
import fs from 'fs'

import executeCommand from '@/utils/commands'
import { checkPortInUse } from '@/utils/helpers'

/**
 * Service command configurations
 */
interface ServiceConfig {
  command: string | (() => Promise<string>) | (() => string)
  cwd?: string | (() => string)
  requiresEnv?: string[]
}

export const SERVICE_COMMANDS: Record<string, ServiceConfig> = {
  server: {
    command: async () => {
      const PORT = process.env.PORT || '3636'

      if (await checkPortInUse(Number(PORT))) {
        log.error(`Port ${PORT} is already in use.`)
        process.exit(1)
      }

      return 'pnpm run dev'
    },
    cwd: 'apps/api'
  },
  docs: {
    command: () => {
      return 'pnpm run dev'
    },
    cwd: 'apps/site'
  },
  client: {
    command: () => {
      if (!fs.existsSync('packages/ui/dist')) {
        executeCommand('pnpm monolith build ui')
      }

      return 'pnpm run dev'
    },
    cwd: 'apps/web'
  },
  ui: {
    command: () => {
      return 'pnpm run dev'
    },
    cwd: 'packages/ui'
  }
}
