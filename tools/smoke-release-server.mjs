import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

if (process.env.CI !== 'true' || process.platform !== 'linux')
  throw Error('Run only on the disposable Linux release runner')
const target = process.argv[2]
if (!['linux-amd64', 'linux-arm64'].includes(target))
  throw Error('Invalid server target')
const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'))
const kit = path.resolve('.temp', `server-kit-${version}`)
const project = 'monolith-release-test'
const environment = {
  MONOLITH_SERVER_IMAGE: `monolith-release:${version}-${target}`,
  MONOLITH_DB_ADMIN_PASSWORD: randomBytes(32).toString('hex'),
  MONOLITH_DB_APP_PASSWORD: randomBytes(32).toString('hex'),
  MASTER_KEY: randomBytes(32).toString('hex'),
  JWT_SIGNING_KEY: randomBytes(32).toString('hex'),
  BOOTSTRAP_TOKEN: randomBytes(32).toString('hex'),
  PUBLIC_URL: 'https://monolith.invalid',
  MONOLITH_CORE_ONLY: '1',
  MONOLITH_DATABASE_VOLUME: 'monolith_release_test_database',
  MONOLITH_FILES_VOLUME: 'monolith_release_test_files'
}
const file = path.join(kit, 'env/.env.docker')
await fs.writeFile(
  file,
  Object.entries(environment)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n'),
  { mode: 0o600 }
)
const compose = args =>
  spawnSync(
    'docker',
    [
      'compose',
      '--project-name',
      project,
      '--env-file',
      file,
      '-f',
      path.join(kit, 'compose.yaml'),
      ...args
    ],
    { stdio: 'inherit' }
  )
try {
  if (
    compose(['up', '--detach', '--wait', '--wait-timeout', '240']).status !== 0
  )
    throw Error('Packaged server did not become healthy')
  const response = await fetch('http://127.0.0.1:8080/healthz', {
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok)
    throw Error(`Gateway health check failed: ${response.status}`)
  console.log(
    `Packaged ${target} server passed database migration, API and gateway health checks.`
  )
} catch (error) {
  compose(['logs', '--tail', '100'])
  throw error
} finally {
  // Only the explicitly named disposable CI project and its test volumes.
  compose(['down', '--volumes'])
  await fs.unlink(file)
}
