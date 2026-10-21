// SPDX-License-Identifier: 0BSD
import { ghApi } from './cli'

export function getGithubLogin() {
  return ghApi<{ login: string }>('user').login
}
export function getGithubUser(): { name: string; email: string } | null {
  try {
    const user = ghApi<{
      name: string | null
      login: string
      email: string | null
    }>('user')
    let email = user.email
    if (!email) {
      try {
        email =
          ghApi<{ email: string; primary: boolean; verified: boolean }[]>(
            'user/emails'
          ).find(row => row.primary && row.verified)?.email ?? null
      } catch {}
    }
    return email ? { name: user.name || user.login, email } : null
  } catch {
    return null
  }
}
