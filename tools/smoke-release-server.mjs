import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

if (process.env.CI !== 'true' || process.platform !== 'linux')
  throw Error('Run only on the disposable Linux release runner')
const target = process.argv[2]
if (!['linux-amd64', 'linux-arm64'].includes(target))
  throw Error('Invalid server target')
const manifest = JSON.parse(await fs.readFile('package.json', 'utf8'))
const { version } = manifest
const kit = path.resolve('.temp', `server-kit-${version}`)
const project = 'monolith-release-test'
const rehearse = process.argv.includes('--updates')
const candidateImage = `monolith-release:${version}-${target}`
const baselineImage = `monolith-rehearsal:baseline-${target}`
if (rehearse) {
  const dockerfile = path.join(kit, 'Dockerfile.baseline')
  await fs.writeFile(
    path.join(kit, 'package.baseline.json'),
    JSON.stringify({ ...manifest, version: '0.0.0' }, null, 2) + '\n'
  )
  await fs.writeFile(
    dockerfile,
    `FROM ${candidateImage}\nCOPY --chown=node:node package.baseline.json /monolith/package.json\nLABEL org.opencontainers.image.version=0.0.0\nENV MONOLITH_RELEASE_VERSION=0.0.0\n`
  )
  const built = spawnSync(
    'docker',
    ['build', '--file', dockerfile, '--tag', baselineImage, kit],
    { stdio: 'inherit' }
  )
  if (built.status !== 0)
    throw Error('Could not build isolated rollback baseline')
}
const environment = {
  MONOLITH_SERVER_IMAGE: rehearse ? baselineImage : candidateImage,
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
    throw Error('Gateway health check failed: ' + response.status)
  if (rehearse) {
    const result = spawnSync(
      process.execPath,
      [
        'tools/native-toolchain.mjs',
        'go',
        'test',
        './internal/updates',
        '-run',
        '^TestComposeRealDockerRelease$',
        '-count=1',
        '-v',
        '-timeout=20m'
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          MONOLITH_DOCKER_REHEARSAL: '1',
          MONOLITH_REHEARSAL_KIT: kit,
          MONOLITH_REHEARSAL_ARTIFACT: path.resolve(
            'dist/platform-releases',
            'v' + version,
            target + '.artifact.json'
          ),
          MONOLITH_REHEARSAL_VERSION: version,
          MONOLITH_REHEARSAL_TARGET: target
        }
      }
    )
    if (result.status !== 0)
      throw Error('Real server update and rollback rehearsal failed')
  }
  console.log(
    'Packaged ' +
      target +
      ' server passed database migration, API and gateway health checks.'
  )
} catch (error) {
  compose(['logs', '--tail', '100'])
  throw error
} finally {
  // Only the explicitly named disposable CI project and its test volumes.
  compose(['down', '--volumes'])
  await fs.unlink(file)
}
