const RAW_DB = Symbol.for('monolith.rawDb')

export function proxyDbQuery<T extends object>(
  database: T,
  names: Record<string, string>
): T {
  const bindings = new Map<PropertyKey, unknown>()
  return new Proxy(database, {
    get(target, member) {
      if (member === RAW_DB) return target
      if (bindings.has(member)) return bindings.get(member)
      const value = Reflect.get(target, member, target)
      let bound: unknown = value
      if (member === 'query' && value && typeof value === 'object') {
        bound = new Proxy(value, {
          get(queries, table) {
            const mapped =
              typeof table === 'string' && Object.hasOwn(names, table)
                ? names[table]!
                : table
            return Reflect.get(queries, mapped, queries)
          }
        })
      } else if (member === 'transaction' && typeof value === 'function') {
        bound = (run: (transaction: T) => unknown, ...options: unknown[]) =>
          value.call(
            target,
            (transaction: T) => run(proxyDbQuery(transaction, names)),
            ...options
          )
      } else if (typeof value === 'function') bound = value.bind(target)
      if (bound !== value || member === 'query') bindings.set(member, bound)
      return bound
    }
  })
}

export function scopeDbForModule<T extends object>(
  database: T,
  names: Record<string, string> | undefined
): T {
  if (!names) return database
  const source = Reflect.get(database, RAW_DB) as T | undefined
  return proxyDbQuery(source ?? database, names)
}
