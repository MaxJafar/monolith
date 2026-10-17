import { decrypt } from '@functions/auth/encryption'
import type { OAuth2Tokens } from 'arctic'

import { db } from '../../../core/drizzle'
import { oauthProvider } from '../constants/oauth_providers'

export async function getProvider(name: string, origin: string) {
  const config = oauthProvider(name)
  const masterKey = process.env.MASTER_KEY
  if (!config || !masterKey) return null
  const stored = await db.query.authOAuthProviders.findFirst({
    where: { provider: name, enabled: true }
  })
  if (!stored?.client_id || !stored.client_secret) return null
  try {
    const open = (value: string) =>
      decrypt(Buffer.from(value, 'base64'), masterKey).toString('utf8')
    const redirectUri = new URL('/auth', origin).toString()
    return {
      client: config.create(
        open(stored.client_id),
        open(stored.client_secret),
        redirectUri
      ),
      redirectUri,
      config
    }
  } catch {
    return null
  }
}

export async function fetchUserEmail(
  provider: string,
  tokens: OAuth2Tokens
): Promise<string | null> {
  const config = oauthProvider(provider)
  if (!config) return null
  try {
    return await config.email(tokens.accessToken())
  } catch {
    return null
  }
}
