import { sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

import { db } from '../drizzle'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Legacy browser tokens remain valid. Device tokens additionally require the
 * issuing server and a live session on every HTTP request or socket packet. */
export async function verifyApplicationToken(token: string) {
  const payload = jwt.verify(token, process.env.JWT_SIGNING_KEY!, {
    algorithms: ['HS512']
  })
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !uuid.test(payload.sub) ||
    !Number.isFinite(payload.exp)
  )
    throw new Error('Invalid authorization credentials')
  if (payload.dsid !== undefined) {
    if (typeof payload.dsid !== 'string' || !uuid.test(payload.dsid))
      throw new Error('Invalid device session')
    const audience =
      typeof payload.aud === 'string'
        ? payload.aud
        : Array.isArray(payload.aud) && payload.aud.length === 1
          ? payload.aud[0]
          : ''
    const alive = await db.transaction(async tx => {
      await tx.execute(
        sql`select set_config('zillion.user_id',${payload.sub!},true),set_config('monolith.device_id',${payload.dsid},true)`
      )
      const result =
        await tx.execute(sql`select s.id from monolith_device_sessions s cross join monolith_server_identity i
        where s.id=${payload.dsid}::uuid and s.user_id=${payload.sub!}::uuid and s.revoked_at is null
        and s.idle_expires_at>now() and s.expires_at>now()
        and i.id::text=${payload.iss ?? ''} and i.id::text=${audience}`)
      return result.length > 0
    })
    if (!alive) throw new Error('Device session expired or revoked')
  }
  return payload
}
