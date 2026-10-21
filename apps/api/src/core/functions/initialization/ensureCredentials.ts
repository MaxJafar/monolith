// SPDX-License-Identifier: 0BSD
import '../../../loadEnv'
import { ensureKeysExist } from '../encryption'

export default function ensureCredentials(): void {
  for (const key of ['MASTER_KEY', 'JWT_SIGNING_KEY']) {
    if (!process.env[key])
      throw new Error('Server configuration is missing ' + key)
  }
  ensureKeysExist()
}
