import { GitHub, Google, type OAuth2Tokens } from 'arctic'
import { z } from 'zod'

import { serviceJSON } from '../../../core/functions/external/serviceRequest'

export interface OAuthClient {
  authorize(state: string, verifier: string): URL
  exchange(code: string, verifier: string): Promise<OAuth2Tokens>
}
export interface ProviderConfig {
  name: string
  icon: string
  create(clientId: string, clientSecret: string, redirect: string): OAuthClient
  email(token: string): Promise<string | null>
}

const googleIdentity = z.object({
  email: z.email(),
  email_verified: z.boolean()
})
const githubEmails = z.array(
  z.object({
    email: z.email(),
    primary: z.boolean(),
    verified: z.boolean()
  })
)
const bearer = (token: string) => ({
  headers: {
    Authorization: 'Bearer ' + token,
    Accept: 'application/json'
  }
})

export const OAUTH_PROVIDER_CONFIGS: Readonly<Record<string, ProviderConfig>> =
  Object.freeze({
    google: {
      name: 'Google',
      icon: 'tabler:brand-google',
      create(id, secret, redirect) {
        const sdk = new Google(id, secret, redirect)
        return {
          authorize: (state, verifier) =>
            sdk.createAuthorizationURL(state, verifier, [
              'openid',
              'profile',
              'email'
            ]),
          exchange: (code, verifier) =>
            sdk.validateAuthorizationCode(code, verifier)
        }
      },
      async email(token) {
        const identity = await serviceJSON(
          'Google identity',
          'https://openidconnect.googleapis.com/v1/userinfo',
          googleIdentity,
          bearer(token)
        )
        return identity.email_verified ? identity.email : null
      }
    },
    github: {
      name: 'GitHub',
      icon: 'tabler:brand-github',
      create(id, secret, redirect) {
        const sdk = new GitHub(id, secret, redirect)
        return {
          authorize: state => sdk.createAuthorizationURL(state, ['user:email']),
          exchange: code => sdk.validateAuthorizationCode(code)
        }
      },
      async email(token) {
        const addresses = await serviceJSON(
          'GitHub identity',
          'https://api.github.com/user/emails',
          githubEmails,
          {
            headers: {
              ...bearer(token).headers,
              'User-Agent': 'Monolith',
              'X-GitHub-Api-Version': '2022-11-28'
            }
          }
        )
        return (
          addresses.find(address => address.primary && address.verified)
            ?.email ?? null
        )
      }
    }
  })

export function oauthProvider(name: string): ProviderConfig | undefined {
  return Object.hasOwn(OAUTH_PROVIDER_CONFIGS, name)
    ? OAUTH_PROVIDER_CONFIGS[name]
    : undefined
}
