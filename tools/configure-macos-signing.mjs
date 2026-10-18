// Used only by the ephemeral GitHub Actions macOS release runner.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

if (
  process.platform !== 'darwin' ||
  process.env.CI !== 'true' ||
  !process.env.RUNNER_TEMP
)
  throw Error('Run signing setup only on the macOS CI release runner')
const stateFile = path.join(
  process.env.RUNNER_TEMP,
  'monolith-signing-state.json'
)
if (process.argv.includes('--cleanup')) {
  let state
  try {
    state = JSON.parse(await fs.readFile(stateFile, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') process.exit(0)
    throw error
  }
  const parent = path.dirname(path.resolve(state.keychain))
  if (
    path.dirname(parent) !== path.resolve(process.env.RUNNER_TEMP) ||
    !path.basename(parent).startsWith('monolith-signing-') ||
    path.basename(state.keychain) !== 'release.keychain-db'
  )
    throw Error('Invalid temporary signing keychain')
  for (const args of [
    ['list-keychains', '-d', 'user', '-s', ...state.previous],
    ['delete-keychain', state.keychain]
  ]) {
    const result = spawnSync('security', args, { stdio: 'inherit' })
    if (result.status !== 0)
      throw Error('Could not remove the temporary signing keychain')
  }
  await fs.unlink(stateFile)
  process.exit(0)
}
for (const key of [
  'MACOS_CERTIFICATE_P12',
  'MACOS_CERTIFICATE_PASSWORD',
  'MACOS_SIGN_IDENTITY',
  'MACOS_TEAM_ID',
  'APPLE_ID',
  'APPLE_APP_PASSWORD'
])
  if (!process.env[key]) throw Error(`Configure the ${key} release secret`)
const root = await fs.mkdtemp(
  path.join(process.env.RUNNER_TEMP, 'monolith-signing-')
)
const keychain = path.join(root, 'release.keychain-db'),
  p12 = path.join(root, 'developer-id.p12'),
  password = randomBytes(32).toString('hex')
const run = (name, args, capture = false) => {
  const result = spawnSync(name, args, {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    windowsHide: true
  })
  if (result.status !== 0) throw Error(`Signing setup command failed: ${name}`)
  return result.stdout?.trim()
}
await fs.writeFile(
  p12,
  Buffer.from(process.env.MACOS_CERTIFICATE_P12, 'base64'),
  { mode: 0o600 }
)
const previous = run('security', ['list-keychains', '-d', 'user'], true)
  .split('\n')
  .map(value => value.trim().replace(/^"|"$/g, ''))
  .filter(Boolean)
run('security', ['create-keychain', '-p', password, keychain])
await fs.writeFile(stateFile, JSON.stringify({ keychain, previous }), {
  mode: 0o600
})
await fs.appendFile(
  process.env.GITHUB_ENV,
  `MACOS_SIGNING_KEYCHAIN=${keychain}\n`
)
try {
  run('security', ['set-keychain-settings', '-lut', '21600', keychain])
  run('security', ['unlock-keychain', '-p', password, keychain])
  run('security', [
    'import',
    p12,
    '-k',
    keychain,
    '-P',
    process.env.MACOS_CERTIFICATE_PASSWORD,
    '-T',
    '/usr/bin/codesign'
  ])
  run('security', [
    'set-key-partition-list',
    '-S',
    'apple-tool:,apple:,codesign:',
    '-s',
    '-k',
    password,
    keychain
  ])
  run('security', ['list-keychains', '-d', 'user', '-s', keychain, ...previous])
  run('xcrun', [
    'notarytool',
    'store-credentials',
    'monolith-release',
    '--keychain',
    keychain,
    '--apple-id',
    process.env.APPLE_ID,
    '--team-id',
    process.env.MACOS_TEAM_ID,
    '--password',
    process.env.APPLE_APP_PASSWORD
  ])
} finally {
  await fs.unlink(p12)
}
console.log('Configured the ephemeral macOS release signing identity')
