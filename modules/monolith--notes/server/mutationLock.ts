import { sql } from 'drizzle-orm'

/** Serializes an owner's hierarchy and attachment changes for this transaction. */
export function notesMutationLock(owner: string) {
  return sql`select pg_advisory_xact_lock(hashtext('zillion-notes'), hashtext(${owner}))`
}
