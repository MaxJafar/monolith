import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const windows = process.platform === 'win32'
const endpoint = windows
  ? '\\\\.\\pipe\\Monolith.BuildGuard.v1'
  : { host: '127.0.0.1', port: 49671 }
const GiB = 1024 ** 3

export function budgetMiB(value = process.env.MONOLITH_BUILD_MEMORY_MIB) {
  const limit = value === undefined ? 4096 : Number(value)
  if (!Number.isInteger(limit) || limit < 256 || limit > 4096)
    throw Error(
      'Build memory limit must be 256–4096 MiB; increases above 4 GiB are refused.'
    )
  return limit
}

export function childEnvironment(token, limit) {
  // A JS heap limit alone does not cover Vite/Rolldown native allocations.
  // Windows additionally limits the entire command tree in a job object.
  const options = (process.env.NODE_OPTIONS || '')
    .replace(
      /--max[-_]old[-_]space[-_]size(?:[-_]percentage)?(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)/g,
      ''
    )
    .trim()
  return {
    ...process.env,
    MONOLITH_BUILD_LEASE: token,
    MONOLITH_BUILD_MEMORY_MIB: String(limit),
    NODE_OPTIONS:
      `${options} --max-old-space-size=${Math.min(2048, Math.floor(limit / 2))}`.trim(),
    RAYON_NUM_THREADS: '2',
    UV_THREADPOOL_SIZE: '2',
    GOMAXPROCS: '2',
    CARGO_BUILD_JOBS: '1',
    CMAKE_BUILD_PARALLEL_LEVEL: '1',
    DOTNET_PROCESSOR_COUNT: '2',
    TURBO_CONCURRENCY: '1'
  }
}

function lineReader(socket, receive) {
  let pending = ''
  socket.setEncoding('utf8')
  socket.on('data', data => {
    pending += data
    if (pending.length > 4096) return socket.destroy()
    for (let index; (index = pending.indexOf('\n')) >= 0;) {
      const line = pending.slice(0, index)
      pending = pending.slice(index + 1)
      try {
        receive(JSON.parse(line))
      } catch {
        socket.destroy()
      }
    }
  })
}

async function acquire(abort) {
  const inherited = process.env.MONOLITH_BUILD_LEASE
  if (inherited) {
    const socket = net.connect(endpoint)
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy()
        reject(Error('Build owner did not respond.'))
      }, 3000)
      socket.once('error', reject)
      socket.once('connect', () =>
        socket.write(JSON.stringify({ acquire: inherited }) + '\n')
      )
      lineReader(socket, message => {
        clearTimeout(timer)
        if (!message.token) {
          socket.destroy()
          reject(Error(message.error || 'Build lease refused.'))
        } else resolve(message.token)
      })
      socket.once('close', () => {
        clearTimeout(timer)
        reject(Error('Build owner disappeared.'))
      })
    })
    socket.on('error', abort)
    socket.on('close', abort)
    return {
      token: result,
      root: false,
      release() {
        socket.removeAllListeners('close')
        socket.removeAllListeners('error')
        socket.on('error', () => {})
        socket.end(JSON.stringify({ release: result }) + '\n')
      }
    }
  }

  const token = randomUUID()
  const stack = [token]
  const sockets = new Set()
  const server = net.createServer(socket => {
    sockets.add(socket)
    let lease,
      released = false
    socket.on('error', () => {})
    lineReader(socket, message => {
      if (message.acquire && !lease) {
        if (message.acquire !== stack.at(-1)) {
          socket.end(
            JSON.stringify({
              error:
                'Another build step is already running. Only one build may run at a time.'
            }) + '\n'
          )
          return
        }
        lease = randomUUID()
        stack.push(lease)
        socket.write(JSON.stringify({ token: lease }) + '\n')
      } else if (message.release === lease && lease) {
        if (stack.at(-1) !== lease) {
          abort()
          return
        }
        stack.pop()
        released = true
        socket.end()
      }
    })
    socket.on('close', () => {
      sockets.delete(socket)
      // Do not release an orphaned compiler's slot and start another build.
      if (lease && !released) abort()
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', error =>
      reject(
        Error(
          error.code === 'EADDRINUSE'
            ? 'Another Monolith build is already running. Wait for it to finish; no second build was started.'
            : error.message
        )
      )
    )
    server.listen(endpoint, resolve)
  })
  return {
    token,
    root: true,
    release() {
      for (const socket of sockets) socket.destroy()
      server.close()
    }
  }
}

function commandSpec(args) {
  if (args[0] === '--task') {
    const task = args[1]
    const pkg = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'))
    const script = pkg.monolithBuilds?.[task]
    if (typeof script !== 'string' || !script)
      throw Error(`No guarded build task: ${task}`)
    const extra = args
      .slice(2)
      .map(value => {
        if (windows) {
          if (/["&|<>^%!\r\n]/.test(value))
            throw Error(
              'Unsupported shell metacharacter in a build argument. Use build:safe for an argument array.'
            )
          return `"${value}"`
        }
        return `'${value.replaceAll("'", "'\\''")}'`
      })
      .join(' ')
    return { script: script + (extra ? ' ' + extra : '') }
  }
  while (args[0] === '--') args.shift()
  if (!args.length)
    throw Error(
      'Use pnpm build:safe -- <command> [arguments], or a normal package build script.'
    )
  // pnpm's JavaScript entry avoids invoking a .cmd file as an executable.
  if (args[0] === 'pnpm') {
    if (!process.env.npm_execpath) throw Error('Run this command through pnpm.')
    return {
      executable: process.execPath,
      args: [process.env.npm_execpath, ...args.slice(1)]
    }
  }
  return { executable: args[0], args: args.slice(1) }
}

export async function main(args = process.argv.slice(2)) {
  const spec = commandSpec([...args])
  const limit = budgetMiB()
  let child,
    cancelled = false,
    lease
  const abort = () => {
    cancelled = true
    if (child?.pid) {
      try {
        if (windows) child.kill()
        else process.kill(-child.pid, 'SIGTERM')
      } catch {}
    }
  }
  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)
  try {
    lease = await acquire(abort)
    if (cancelled) throw Error('Build cancelled before launch.')
    const env = childEnvironment(lease.token, limit)
    env.MONOLITH_BUILD_REQUEST = JSON.stringify({
      ...spec,
      cwd: process.cwd(),
      node: process.execPath,
      dispatcher: path.join(directory, 'build-guard-exec.mjs'),
      owner: process.pid,
      root: lease.root,
      limitMiB: limit
    })
    if (windows) {
      const powershell = path.join(
        process.env.SystemRoot || 'C:\\Windows',
        'System32/WindowsPowerShell/v1.0/powershell.exe'
      )
      child = spawn(
        powershell,
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          path.join(directory, 'build-guard.ps1')
        ],
        { env, stdio: 'inherit', windowsHide: true }
      )
    } else {
      if (
        os.freemem() < Math.max(2 * GiB, limit * 2 * 1024 ** 2) ||
        1 - os.freemem() / os.totalmem() >= 0.75
      )
        throw Error(
          'Build refused: insufficient free RAM for the configured cap or memory use at least 75%.'
        )
      child = spawn(
        process.execPath,
        [path.join(directory, 'build-guard-exec.mjs')],
        { env, stdio: 'inherit', detached: true }
      )
    }
    const monitor =
      !windows &&
      setInterval(() => {
        if (
          os.freemem() < Math.max(GiB, limit * 1.5 * 1024 ** 2) ||
          1 - os.freemem() / os.totalmem() >= 0.8
        )
          abort()
      }, 1000)
    try {
      const code = await new Promise((resolve, reject) => {
        child.once('error', reject)
        child.once('exit', (code, signal) =>
          resolve(signal ? 130 : (code ?? 1))
        )
      })
      return cancelled ? 130 : code
    } finally {
      if (monitor) clearInterval(monitor)
    }
  } finally {
    lease?.release()
    process.removeListener('SIGINT', abort)
    process.removeListener('SIGTERM', abort)
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main()
    .then(code => {
      process.exitCode = code
    })
    .catch(error => {
      console.error(`[build guard] ${error.message}`)
      process.exitCode = 1
    })
}
