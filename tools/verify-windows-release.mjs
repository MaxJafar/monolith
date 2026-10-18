import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function verifyWindowsFiles(files) {
  if (process.platform !== 'win32')
    throw Error('Verify Authenticode on Windows')
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'monolith-verify-'))
  const list = path.join(folder, 'files.json')
  const script = path.join(folder, 'verify.ps1')
  try {
    await fs.writeFile(list, JSON.stringify(files))
    await fs.writeFile(
      script,
      `$ErrorActionPreference = 'Stop'
foreach ($artifact in (Get-Content -LiteralPath $env:MONOLITH_VERIFY_FILES | ConvertFrom-Json)) {
  $signature = Get-AuthenticodeSignature -LiteralPath $artifact
  if ($signature.Status -ne 'Valid' -or $null -eq $signature.SignerCertificate -or $null -eq $signature.TimeStamperCertificate) {
    throw ('A trusted, timestamped Authenticode signature is required: ' + [IO.Path]::GetFileName($artifact))
  }
}
`
    )
    const result = spawnSync(
      'pwsh',
      ['-NoProfile', '-NonInteractive', '-File', script],
      {
        stdio: 'inherit',
        windowsHide: true,
        env: { ...process.env, MONOLITH_VERIFY_FILES: list }
      }
    )
    if (result.error) throw result.error
    if (result.status !== 0)
      throw Error('Windows release trust verification failed')
  } finally {
    await fs.unlink(list).catch(() => {})
    await fs.unlink(script).catch(() => {})
    await fs.rmdir(folder)
  }
}
