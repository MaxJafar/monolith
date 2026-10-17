import { log } from '@clack/prompts'
import fs from 'node:fs'
import path from 'node:path'

import { ROOT_DIR } from '@/utils/constants'

interface ModuleBasicInfo {
  name: string
  displayName: string
  version: string
}

/** Discover source addons, including local scaffolds that were never published. */
export default function listModules(
  exitIfNoModule = false
): Record<string, ModuleBasicInfo> {
  const directory = path.join(ROOT_DIR, 'modules')
  const modules: Record<string, ModuleBasicInfo> = {}
  for (const entry of fs.existsSync(directory)
    ? fs.readdirSync(directory)
    : []) {
    const file = path.join(directory, entry, 'package.json')
    if (!fs.existsSync(file)) continue
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!pkg.monolith || !pkg.name) continue
    modules[pkg.name] = {
      name: pkg.name,
      displayName: pkg.displayName,
      version: pkg.version
    }
  }
  if (exitIfNoModule && !Object.keys(modules).length) {
    log.step('No Monolith addons installed.')
    process.exit(0)
  }
  return modules
}
