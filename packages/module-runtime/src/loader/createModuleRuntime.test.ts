// SPDX-License-Identifier: 0BSD
import { Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createModuleRuntime } from './createModuleRuntime'

const loader = vi.hoisted(() => ({
  load: vi.fn(),
  watch: vi.fn(),
  dispose: vi.fn()
}))
vi.mock('./createModuleLoader', () => ({ createModuleLoader: () => loader }))

beforeEach(() => {
  vi.clearAllMocks()
})

function setup(build = () => Router()) {
  const outerRouter = Router()
  outerRouter.use((_req, _res, next) => next())
  const runtime = createModuleRuntime({
    outerRouter,
    modulesDir: '/fixture',
    isProduction: true,
    buildRouter: build
  })
  outerRouter.use((_req, res) => res.status(404).end())
  return { runtime, outerRouter, mount: outerRouter.stack[1] }
}

describe('atomic router replacement', () => {
  it('coalesces requests and leaves middleware order unchanged', async () => {
    let complete!: (routes: object) => void
    loader.load.mockReturnValue(
      new Promise(resolve => {
        complete = resolve
      })
    )
    const replacement = Router()
    replacement.get('/probe', (_request, response) => response.end('ready'))
    const build = vi.fn(() => replacement)
    const { runtime, outerRouter, mount } = setup(build)
    const first = runtime.reload(),
      second = runtime.reload()
    expect(first).toBe(second)
    complete({})
    await first
    expect(build).toHaveBeenCalledOnce()
    expect(mount.handle).toBe(replacement)
    expect(outerRouter.stack[1]).toBe(mount)
    expect(outerRouter.stack).toHaveLength(3)
    runtime.dispose()
  })

  it('keeps the last router serving when a replacement cannot be built', async () => {
    loader.load.mockResolvedValue({})
    const ready = Router()
    const build = vi
      .fn()
      .mockReturnValueOnce(ready)
      .mockImplementationOnce(() => {
        throw Error('Invalid routes')
      })
    const { runtime, mount } = setup(build)
    await runtime.reload()
    await expect(runtime.reload()).rejects.toThrow('Invalid routes')
    expect(mount.handle).toBe(ready)
    runtime.dispose()
  })

  it('cancels a pending activation when disposed', async () => {
    let complete!: (routes: object) => void
    loader.load.mockReturnValue(
      new Promise(resolve => {
        complete = resolve
      })
    )
    const build = vi.fn(() => Router())
    const { runtime, mount } = setup(build)
    const placeholder = mount.handle
    runtime.watch()
    expect(loader.watch).toHaveBeenCalledWith(expect.any(Function))
    const pending = runtime.reload()
    runtime.dispose()
    complete({})
    await pending
    expect(build).not.toHaveBeenCalled()
    expect(mount.handle).toBe(placeholder)
    expect(loader.dispose).toHaveBeenCalledOnce()
  })
})
