import { resolveAddonIdentity } from '@monolith/configs/node'
import { and, eq, gt, sql } from 'drizzle-orm'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { credentials, principals } from './schema.drizzle'
import type { Database } from './store'

export const hashSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex')

export const newLease = () => randomBytes(32).toString('base64url')

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const pattern = new RegExp(
  `^za1\\.(${uuid})\\.(${uuid})\\.([A-Za-z0-9_-]{43})$`
)

export function createAgentToken(owner: string) {
  const id = randomUUID()
  const token = `za1.${owner}.${id}.${newLease()}`

  return { id, token, token_hash: hashSecret(token) }
}

export function parseAgentToken(token: string) {
  const match = pattern.exec(token)

  return match ? { owner: match[1]!, id: match[2]! } : null
}

export function agentRuntimeEndpoint(method: string, url: string) {
  const path = url.split('?')[0]
  const remote = resolveAddonIdentity({ name: '@monolith/agents' }).remoteId
  const prefix = `^/modules/(?:monolith--agents|${remote})/runtime/`

  return method === 'GET'
    ? new RegExp(prefix + '(me|inbox)$').test(path || '')
    : method === 'POST' &&
        new RegExp(prefix + '(claim|heartbeat|complete|fail|comment)$').test(
          path || ''
        )
}

// A machine credential selects an owner transaction, never an unrestricted DB role.
export async function authenticateAgent(db: Database, token: string) {
  const parsed = parseAgentToken(token)

  if (!parsed) return null

  return db.transaction(async tx => {
    await tx.execute(
      sql`select set_config('zillion.user_id', ${parsed.owner}, true)`
    )
    const [row] = await tx
      .select({ principal: principals, credential: credentials })
      .from(credentials)
      .innerJoin(principals, eq(credentials.principal_id, principals.id))
      .where(
        and(
          eq(credentials.id, parsed.id),
          eq(credentials.owner_id, parsed.owner),
          eq(credentials.token_hash, hashSecret(token)),
          eq(credentials.revoked, false),
          gt(credentials.expires, new Date()),
          eq(principals.owner_id, parsed.owner),
          eq(principals.kind, 'agent'),
          eq(principals.status, 'active')
        )
      )

    if (!row) return null

    return {
      owner: parsed.owner,
      principalId: row.principal.id,
      credentialId: row.credential.id
    }
  })
}
