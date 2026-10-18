// This dispatcher is launched suspended and assigned to the Windows job before
// it can execute. Every compiler it starts inherits that job's aggregate limit.
import { spawn } from 'node:child_process'

const request = JSON.parse(process.env.MONOLITH_BUILD_REQUEST || 'null')
if (!request || !process.env.MONOLITH_BUILD_LEASE)
  throw Error('Use the build guard entry point.')
const env = { ...process.env }
delete env.MONOLITH_BUILD_REQUEST
const child = request.script
  ? spawn(request.script, {
      cwd: request.cwd,
      env,
      shell: true,
      stdio: 'inherit',
      windowsHide: true
    })
  : spawn(request.executable, request.args, {
      cwd: request.cwd,
      env,
      stdio: 'inherit',
      windowsHide: true
    })
child.once('error', error => {
  console.error(error.message)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  process.exitCode = signal ? 130 : (code ?? 1)
})
