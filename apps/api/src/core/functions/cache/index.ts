export interface Cache<T = unknown> {
  get(key: string): T | undefined
  set(key: string, value: T, ttl?: number): boolean
  del(key: string): boolean
  has(key: string): boolean
  clear(): void
  keys(): string[]
  readonly size: number
  expiryTime(key: string): number | undefined
}

type Entry = { value: unknown; expires: number }

class MemoryCache<T> implements Cache<T> {
  private readonly entries = new Map<string, Entry>()
  constructor(private readonly defaultTTL: number) {}

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key)
    if (entry && entry.expires !== 0 && entry.expires <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry
  }

  get(key: string): T | undefined {
    return this.live(key)?.value as T | undefined
  }
  has(key: string): boolean {
    return this.live(key) !== undefined
  }
  set(key: string, value: T, ttl = this.defaultTTL): boolean {
    if (!Number.isFinite(ttl)) throw new TypeError('Cache TTL must be finite')
    this.entries.set(key, {
      value: value === undefined ? null : value,
      expires: ttl === 0 ? 0 : Date.now() + ttl * 1000
    })
    return true
  }
  del(key: string): boolean {
    return this.entries.delete(key)
  }
  clear(): void {
    this.entries.clear()
  }
  keys(): string[] {
    return [...this.entries.keys()].filter(key => this.live(key) !== undefined)
  }
  get size(): number {
    return this.keys().length
  }
  expiryTime(key: string): number | undefined {
    return this.live(key)?.expires
  }
}

const namespaces = new Map<string, Cache>()
export function createCache<T = unknown>(
  namespace: string,
  options?: { stdTTL?: number }
): Cache<T> {
  if (!namespaces.has(namespace))
    namespaces.set(namespace, new MemoryCache(options?.stdTTL ?? 0))
  return namespaces.get(namespace)! as Cache<T>
}
