import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

import { ProfileStore } from './profiles.js'

vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof fs>()
  return { ...original, open: vi.fn(original.open) }
})

afterEach(() => vi.clearAllMocks())

it.skipIf(process.platform !== 'win32')(
  'waits for a deleting Windows lock, then runs the protected action once',
  async () => {
    const directory = await fs.mkdtemp(join(tmpdir(), 'monolith-lock-test-'))
    try {
      const store = new ProfileStore('default', directory)
      const realOpen = (await vi.importActual<typeof fs>('node:fs/promises'))
        .open
      let denied = 0
      vi.mocked(fs.open).mockImplementation(async (...args) => {
        if (args[0] === store.file + '.lock' && denied < 2) {
          const code = denied++ === 0 ? 'EPERM' : 'EACCES'
          throw Object.assign(new Error('File pending deletion'), { code })
        }
        return realOpen(...args)
      })
      const action = vi.fn(async () => 'saved')
      await expect(store.locked(action)).resolves.toBe('saved')
      expect(denied).toBe(2)
      expect(action).toHaveBeenCalledTimes(1)
      await expect(fs.stat(store.file + '.lock')).rejects.toMatchObject({
        code: 'ENOENT'
      })
    } finally {
      expect(dirname(directory)).toBe(tmpdir())
      await fs.rm(directory, { recursive: true, force: true })
    }
  }
)
