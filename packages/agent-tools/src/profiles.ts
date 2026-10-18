import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'

import { serverOrigin } from './http.js'
import { MonolithError, type Profile } from './types.js'

const profileSchema = z
  .object({
    version: z.literal(1),
    server: z.string().transform(serverOrigin),
    serverId: z.uuid(),
    accountId: z.uuid(),
    sessionId: z.uuid(),
    accessToken: z.string().min(1).max(16384),
    refreshToken: z.string().min(1).max(512),
    expiresAt: z.number().finite()
  })
  .strict()

export class ProfileStore {
  readonly file: string
  constructor(
    readonly profile = 'default',
    directory = process.env.MONOLITH_CONFIG_DIR ??
      join(homedir(), '.monolith', 'agents')
  ) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile))
      throw new MonolithError(
        'Profile names can contain letters, numbers, underscores and hyphens.'
      )
    this.file = resolve(directory, `${profile}.json`)
  }
  async read(): Promise<Profile> {
    try {
      const value = profileSchema.parse(
        JSON.parse(await readFile(this.file, 'utf8'))
      )
      return value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new MonolithError(
          `Profile ${this.profile} is not signed in. Run auth login --server <url> --email <email>.`,
          'not_signed_in'
        )
      throw new MonolithError(
        'The login profile is unreadable or invalid. Sign in again.',
        'invalid_profile'
      )
    }
  }
  async save(profile: Profile) {
    profileSchema.parse(profile)
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 })
    const temporary = `${this.file}.${randomUUID()}.tmp`
    const handle = await open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(JSON.stringify(profile), 'utf8')
      await handle.sync()
      await handle.close()
      await rename(temporary, this.file)
    } finally {
      await handle.close().catch(() => {})
      await rm(temporary, { force: true })
    }
  }
  async remove() {
    await rm(this.file, { force: true })
  }

  /** Serialize rotating refresh tokens across CLI and multiple MCP processes.
   * A replay would revoke the entire session at the gateway. */
  async locked<T>(action: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 })
    const lock = `${this.file}.lock`
    const owner = JSON.stringify({ pid: process.pid, nonce: randomUUID() })
    const deadline = Date.now() + 35_000
    while (true) {
      try {
        const handle = await open(lock, 'wx', 0o600)
        try {
          await handle.writeFile(owner)
        } finally {
          await handle.close()
        }
        break
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        // Windows can deny opening a lock briefly while another process deletes
        // it. Keep the same bounded contention loop; never reclaim a live owner.
        const deleting =
          process.platform === 'win32' &&
          (code === 'EPERM' || code === 'EACCES')
        if (code !== 'EEXIST' && !deleting) throw error
        // Reclaim only an abandoned lock, never a slow live refresh.
        // Serialize reclaimers too: two stale observations must not unlink a
        // replacement lock acquired by a live process in between them.
        let reclaimer: Awaited<ReturnType<typeof open>> | undefined
        try {
          reclaimer = await open(`${lock}.reclaim`, 'wx', 0o600)
          const raw = await readFile(lock, 'utf8')
          let alive = true
          try {
            const pid: unknown = JSON.parse(raw).pid
            if (typeof pid === 'number' && Number.isInteger(pid) && pid > 0) {
              try {
                process.kill(pid, 0)
              } catch (failure) {
                alive = (failure as NodeJS.ErrnoException).code !== 'ESRCH'
              }
            }
          } catch {
            alive = Date.now() - (await stat(lock)).mtimeMs < 120_000
          }
          if (!alive && (await readFile(lock, 'utf8')) === raw)
            await rm(lock, { force: true })
        } catch (failure) {
          if (
            ![
              'ENOENT',
              'EEXIST',
              ...(process.platform === 'win32' ? ['EPERM', 'EACCES'] : [])
            ].includes((failure as NodeJS.ErrnoException).code ?? '')
          )
            throw failure
        } finally {
          if (reclaimer) {
            await reclaimer.close()
            await rm(`${lock}.reclaim`, { force: true })
          }
        }
        if (Date.now() > deadline)
          throw new MonolithError(
            'Another process is updating this login profile. Try again when it finishes.',
            'profile_busy'
          )
        await delay(50)
      }
    }
    try {
      return await action()
    } finally {
      if ((await readFile(lock, 'utf8').catch(() => '')) === owner)
        await rm(lock, { force: true })
    }
  }
}
