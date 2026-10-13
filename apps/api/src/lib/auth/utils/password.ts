import { hash, verify } from 'argon2'
import { compare } from 'bcryptjs'

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<{ valid: boolean; replacement?: string }> {
  try {
    if (/^\$2[aby]\$/.test(passwordHash)) {
      const valid = await compare(
        password,
        passwordHash.replace(/^\$2y\$/, '$2b$')
      )

      return valid
        ? { valid, replacement: await hash(password, { type: 2 }) }
        : { valid: false }
    }
    if (!passwordHash.startsWith('$argon2')) return { valid: false }

    return { valid: await verify(passwordHash, password) }
  } catch {
    return { valid: false }
  }
}
