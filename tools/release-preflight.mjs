import { createPrivateKey, createPublicKey } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function releaseProblems(env, pinnedKey) {
  const problems = []
  const required = [
    'MONOLITH_RELEASE_PUBLIC_KEY',
    'MONOLITH_RELEASE_PRIVATE_KEY',
    'MONOLITH_ADDON_CATALOG_PRIVATE_KEY',
    'WINDOWS_CERTIFICATE_P12',
    'WINDOWS_CERTIFICATE_PASSWORD',
    'MACOS_CERTIFICATE_P12',
    'MACOS_CERTIFICATE_PASSWORD',
    'MACOS_SIGN_IDENTITY',
    'MACOS_TEAM_ID',
    'APPLE_ID',
    'APPLE_APP_PASSWORD'
  ]
  for (const name of required)
    if (!env[name]?.trim()) problems.push(`Missing ${name}`)
  const publicDer = value => {
    const key = createPublicKey(value.replaceAll('\\n', '\n'))
    if (key.asymmetricKeyType !== 'ed25519') throw Error('Wrong key type')
    return key.export({ format: 'der', type: 'spki' })
  }
  if (env.MONOLITH_RELEASE_PUBLIC_KEY && env.MONOLITH_RELEASE_PRIVATE_KEY) {
    try {
      const privateKey = createPrivateKey(
        env.MONOLITH_RELEASE_PRIVATE_KEY.replaceAll('\\n', '\n')
      )
      if (
        privateKey.asymmetricKeyType !== 'ed25519' ||
        !createPublicKey(privateKey)
          .export({ format: 'der', type: 'spki' })
          .equals(publicDer(env.MONOLITH_RELEASE_PUBLIC_KEY)) ||
        !publicDer(pinnedKey).equals(publicDer(env.MONOLITH_RELEASE_PUBLIC_KEY))
      )
        throw Error('Key mismatch')
    } catch {
      problems.push(
        'The release signing keys must match the pinned Ed25519 public key'
      )
    }
  }
  if (env.MACOS_TEAM_ID && !/^[A-Z0-9]{10}$/.test(env.MACOS_TEAM_ID))
    problems.push(
      'MACOS_TEAM_ID must be the ten-character Apple team identifier'
    )
  if (
    env.MACOS_SIGN_IDENTITY &&
    (!env.MACOS_SIGN_IDENTITY.startsWith('Developer ID Application: ') ||
      !env.MACOS_SIGN_IDENTITY.endsWith(`(${env.MACOS_TEAM_ID})`))
  )
    problems.push(
      'MACOS_SIGN_IDENTITY must be a Developer ID Application identity for MACOS_TEAM_ID'
    )
  return problems
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const pinnedKey = await fs.readFile(
    new URL('../release/keys/app-release.pem', import.meta.url),
    'utf8'
  )
  const problems = releaseProblems(process.env, pinnedKey)
  if (problems.length) {
    console.error(
      'Stable release configuration is incomplete:\n' +
        problems.map(problem => `- ${problem}`).join('\n')
    )
    process.exitCode = 1
  } else
    console.log(
      'Release credentials are present and the update signing keys match. Platform jobs will verify certificate trust and notarization.'
    )
}
