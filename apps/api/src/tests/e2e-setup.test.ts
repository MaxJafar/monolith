import { afterEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({ delete: vi.fn() }))
vi.mock('../core/drizzle', () => ({ db: database }))
vi.mock('./utils', () => ({ workspaceAPI: {} }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
  database.delete.mockClear()
})

describe('Authentication verification cleanup safety', () => {
  it('does not remove application sessions when setup was never completed', async () => {
    const { cleanupTestTokens } = await import('./e2e-setup')
    await cleanupTestTokens()
    expect(database.delete).not.toHaveBeenCalled()
  })
  it('does not remove sessions after missing test credentials reject setup', async () => {
    vi.stubEnv('VITE_TEST_USER_PASSWORD', '')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 }))
    )
    const { initAuthTests, cleanupTestTokens } = await import('./e2e-setup')
    await expect(initAuthTests()).rejects.toThrow('TEST_USER_PASSWORD')
    await cleanupTestTokens()
    expect(database.delete).not.toHaveBeenCalled()
  })
})
