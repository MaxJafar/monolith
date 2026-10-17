import { ROOT_DIR } from '@constants'
import fs from 'node:fs'
import path from 'node:path'

import { AddonShop } from './service'

export const addonShop = new AddonShop({
  root: process.env.MONOLITH_ADDON_STATE_ROOT || ROOT_DIR,
  hostVersion: JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8')
  ).version,
  catalogFile: process.env.MONOLITH_ADDON_CATALOG_FILE,
  catalogUrl: process.env.MONOLITH_ADDON_CATALOG_URL,
  schemaFile: process.env.MONOLITH_ADDON_SCHEMA_FILE,
  publicKey: process.env.MONOLITH_ADDON_CATALOG_PUBLIC_KEY?.replace(
    /\\n/g,
    '\n'
  )
})
export const canManageAddons = (id: string) =>
  !!id &&
  (process.env.MONOLITH_ADDON_ADMIN_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .includes(id)
