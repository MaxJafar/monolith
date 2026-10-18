import { z } from 'zod'

import { request, serverOrigin } from './http.js'
import { ProfileStore } from './profiles.js'
import { MonolithError, type Profile } from './types.js'

const tokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accountId: z.uuid(),
  sessionId: z.uuid(),
  expiresIn: z.number().positive()
})
const discoverySchema = z.object({
  serverId: z.uuid(),
  apiVersion: z.literal(1),
  publicUrl: z.string()
})

export class MonolithClient {
  constructor(readonly store: ProfileStore) {}
  async login(
    server: string,
    email: string,
    password: string,
    code: () => Promise<string>
  ) {
    const origin = serverOrigin(server)
    const discovery = discoverySchema.parse(
      await request(origin, '/.well-known/monolith')
    )
    if (serverOrigin(discovery.publicUrl) !== origin)
      throw new MonolithError(
        'Gateway advertises a different public URL. Use its configured public origin.'
      )
    return this.store.locked(async () => {
      // Avoid silently leaving an old session behind when overwriting a profile.
      try {
        await this.store.read()
        throw new MonolithError(
          'This profile is already signed in. Run auth logout first or choose a different --profile.',
          'already_signed_in'
        )
      } catch (error) {
        if (!(error instanceof MonolithError) || error.code !== 'not_signed_in')
          throw error
      }
      let result: any = await request(origin, '/api/v1/device-sessions', {
        method: 'POST',
        body: {
          email,
          password,
          deviceName: `Monolith agents (${this.store.profile})`
        }
      })
      if (
        result?.state === 'totp_required' &&
        typeof result.challenge === 'string'
      )
        result = await request(origin, '/api/v1/device-sessions/totp', {
          method: 'POST',
          body: { challenge: result.challenge, code: await code() }
        })
      const { expiresIn, ...tokens } = tokenSchema.parse(result)
      const profile: Profile = {
        ...tokens,
        version: 1,
        server: origin,
        serverId: discovery.serverId,
        expiresAt: Date.now() + expiresIn * 1000
      }
      try {
        await this.store.save(profile)
      } catch (error) {
        await request(origin, `/api/v1/device-sessions/${tokens.sessionId}`, {
          method: 'DELETE',
          token: tokens.accessToken
        }).catch(() => {})
        throw error
      }
      return this.summary(profile)
    })
  }
  summary(profile: Profile) {
    return {
      profile: this.store.profile,
      server: profile.server,
      accountId: profile.accountId,
      sessionId: profile.sessionId,
      accessExpiresAt: new Date(profile.expiresAt).toISOString()
    }
  }
  private async session(previousToken?: string): Promise<Profile> {
    return this.store.locked(async () => {
      const current = await this.store.read()
      if (
        current.expiresAt > Date.now() + 60_000 &&
        (!previousToken || current.accessToken !== previousToken)
      )
        return current
      const tokens = tokenSchema.parse(
        await request(current.server, '/api/v1/device-sessions/refresh', {
          method: 'POST',
          body: { refreshToken: current.refreshToken }
        })
      )
      if (
        tokens.accountId !== current.accountId ||
        tokens.sessionId !== current.sessionId
      )
        throw new MonolithError(
          'Server returned a different session.',
          'invalid_response'
        )
      const updated: Profile = {
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000
      }
      await this.store.save(updated)
      return updated
    })
  }
  async api(
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    let profile = await this.session()
    try {
      return await request(profile.server, path, {
        method,
        body,
        token: profile.accessToken,
        signal
      })
    } catch (error) {
      // Only a pre-handler authentication rejection is safe to repeat.
      if (!(error instanceof MonolithError) || error.status !== 401) throw error
      profile = await this.session(profile.accessToken)
      return request(profile.server, path, {
        method,
        body,
        token: profile.accessToken,
        signal
      })
    }
  }
  async status() {
    const sessions = await this.api('/api/v1/device-sessions')
    const profile = await this.store.read()
    return { ...this.summary(profile), connected: true, sessions }
  }
  async logout(localOnly = false) {
    if (!localOnly) {
      const profile = await this.store.read()
      try {
        await this.api(`/api/v1/device-sessions/${profile.sessionId}`, 'DELETE')
      } catch (error) {
        if (
          !(error instanceof MonolithError) ||
          ![401, 404].includes(error.status ?? 0)
        )
          throw error
      }
    }
    await this.store.locked(() => this.store.remove())
    return { signedOut: true, revoked: !localOnly }
  }
}
