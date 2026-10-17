import { generateCodeVerifier, generateState } from 'arctic'

type Challenge = {
  provider: string
  origin: string
  verifier: string
  expires: number
}

/** One process owns each challenge; consume before exchanging a code. */
export function createOAuthChallenges(now: () => number = Date.now) {
  const entries = new Map<string, Challenge>()

  return {
    issue(provider: string, origin: string) {
      for (const [key, value] of entries)
        if (value.expires <= now()) entries.delete(key)
      if (entries.size >= 1000)
        throw new Error('Too many pending sign-in attempts')

      const state = generateState()
      const challenge = {
        provider,
        origin,
        verifier: generateCodeVerifier(),
        expires: now() + 300_000
      }
      entries.set(state, challenge)

      return { state, verifier: challenge.verifier }
    },
    consume(state: string, provider: string, origin: string): Challenge | null {
      const challenge = entries.get(state)

      if (!challenge) return null

      if (challenge.expires <= now()) {
        entries.delete(state)

        return null
      }
      if (challenge.origin !== origin || challenge.provider !== provider)
        return null
      entries.delete(state)

      return { ...challenge }
    }
  }
}
