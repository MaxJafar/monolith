import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { verifyWindowsFiles } from './verify-windows-release.mjs'

if (
  process.platform !== 'win32' ||
  process.env.CI !== 'true' ||
  !process.env.RUNNER_TEMP
)
  throw Error('Run release signing only on the ephemeral Windows CI runner')
if (!['binaries', 'installers'].includes(process.argv[2]))
  throw Error('Choose binaries or installers')
const files =
  process.argv[2] === 'installers'
    ? (await fs.readdir('apps/desktop/src-tauri/target/release/bundle/nsis'))
        .filter(name => name.endsWith('.exe'))
        .map(name =>
          path.resolve(
            'apps/desktop/src-tauri/target/release/bundle/nsis',
            name
          )
        )
    : [
        path.resolve(
          'apps/desktop/src-tauri/target/release/monolith-desktop.exe'
        ),
        path.resolve('apps/desktop/src-tauri/updater/monolith-updater.exe')
      ]
if (!files.length) throw Error('No Windows artifacts to sign')
const cloudRoot = path.resolve('.temp/windows-signing', process.argv[2])
if (process.argv.includes('--prepare-cloud')) {
  const input = path.join(cloudRoot, 'input')
  await fs.mkdir(input, { recursive: true })
  if ((await fs.readdir(input)).length)
    throw Error('Cloud signing inputs must start empty')
  for (const file of files)
    await fs.copyFile(file, path.join(input, path.basename(file)))
  console.log(
    'Prepared only the expected Windows release files for cloud signing'
  )
  process.exit(0)
}
if (process.argv.includes('--collect-cloud')) {
  const output = path.join(cloudRoot, 'signed')
  const names = files.map(file => path.basename(file)).sort()
  if (
    JSON.stringify((await fs.readdir(output)).sort()) !== JSON.stringify(names)
  )
    throw Error('Cloud signing did not return the exact Windows artifact set')
  const signed = names.map(name => path.join(output, name))
  await verifyWindowsFiles(signed)
  for (const file of files)
    await fs.copyFile(path.join(output, path.basename(file)), file)
  console.log('Collected verified cloud-signed Windows release files')
  process.exit(0)
}
if (process.argv.includes('--verify')) {
  await verifyWindowsFiles(files)
  console.log('Verified trusted, timestamped Windows release signatures')
  process.exit(0)
}
if (
  !process.env.WINDOWS_CERTIFICATE_P12 ||
  !process.env.WINDOWS_CERTIFICATE_PASSWORD
)
  throw Error('Configure the Windows certificate and password release secrets')
const folder = await fs.mkdtemp(
    path.join(process.env.RUNNER_TEMP, 'monolith-signing-')
  ),
  pfx = path.join(folder, 'release.pfx')
await fs.writeFile(
  pfx,
  Buffer.from(process.env.WINDOWS_CERTIFICATE_P12, 'base64')
)
const script = path.join(folder, 'sign.ps1')
await fs.writeFile(
  script,
  `$ErrorActionPreference = 'Stop'
$password = ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force
$imported = @(Import-PfxCertificate -FilePath $env:MONOLITH_SIGNING_PFX -CertStoreLocation Cert:\\CurrentUser\\My -Password $password)
$certificate = $imported | Where-Object HasPrivateKey | Select-Object -First 1
try {
  if ($null -eq $certificate) { throw 'The signing certificate has no private key' }
  foreach ($artifact in (Get-Content -LiteralPath $env:MONOLITH_SIGNING_FILES | ConvertFrom-Json)) {
    $result = Set-AuthenticodeSignature -FilePath $artifact -Certificate $certificate -HashAlgorithm SHA256 -TimestampServer $env:WINDOWS_TIMESTAMP_URL
    if ($result.Status -ne 'Valid') { throw 'Windows artifact signature validation failed' }
  }
} finally { foreach ($entry in $imported) { Remove-Item -LiteralPath ('Cert:\\CurrentUser\\My\\' + $entry.Thumbprint) -Force } }
`
)
const fileList = path.join(folder, 'files.json')
await fs.writeFile(fileList, JSON.stringify(files))
try {
  const result = spawnSync(
    'pwsh',
    ['-NoProfile', '-NonInteractive', '-File', script],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: {
        ...process.env,
        MONOLITH_SIGNING_PFX: pfx,
        MONOLITH_SIGNING_FILES: fileList,
        WINDOWS_TIMESTAMP_URL:
          process.env.WINDOWS_TIMESTAMP_URL || 'http://timestamp.digicert.com'
      }
    }
  )
  if (result.status !== 0) throw Error('Windows release signing failed')
} finally {
  await fs.unlink(pfx)
}
await verifyWindowsFiles(files)
console.log(`Signed and verified ${files.length} Windows release artifacts`)
