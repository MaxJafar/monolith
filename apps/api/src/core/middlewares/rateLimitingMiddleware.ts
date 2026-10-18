import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'

const exemptions = new Map<string, Set<string>>()
const pathKey = (value: string) =>
  value.trim().toLowerCase().replace(/\/+$/, '') || '/'

export function disableRateLimitForRoute(method: string, path: string): void {
  const verb = method.toUpperCase()
  if (!exemptions.has(verb)) exemptions.set(verb, new Set())
  exemptions.get(verb)!.add(pathKey(path))
}

export default rateLimit({
  windowMs: 900000,
  max: 250,
  skip(request) {
    const path = pathKey(request.path)
    if (exemptions.get(request.method.toUpperCase())?.has(path)) return true
    if (path === '/modules' || path.startsWith('/modules/')) return true
    const token = /^Bearer\s+(\S+)$/i.exec(
      request.headers.authorization ?? ''
    )?.[1]
    if (!token || !process.env.JWT_SIGNING_KEY) return false
    try {
      const payload = jwt.verify(token, process.env.JWT_SIGNING_KEY, {
        algorithms: ['HS512']
      })
      return (
        typeof payload === 'object' &&
        typeof payload.sub === 'string' &&
        payload.sub.length > 0
      )
    } catch {
      return false
    }
  },
  validate: { xForwardedForHeader: false }
})
