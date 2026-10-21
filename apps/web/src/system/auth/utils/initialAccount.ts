// SPDX-License-Identifier: 0BSD
export const initialAccount = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
}
export function validateAccount(draft: typeof initialAccount) {
  const account = {
    name: draft.name.trim(),
    username: draft.username.trim(),
    email: draft.email.trim(),
    password: draft.password
  }
  const errors: Partial<Record<keyof typeof initialAccount, string>> = {}
  for (const field of ['name', 'username', 'email', 'password'] as const) {
    if (!account[field]) errors[field] = field + 'Required'
  }
  if (account.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email))
    errors.email = 'emailInvalid'
  if (account.username && !/^[a-zA-Z0-9_]+$/.test(account.username))
    errors.username = 'usernameInvalid'
  if (account.username && account.username.length < 3)
    errors.username = 'usernameTooShort'
  if (account.password && account.password.length < 8)
    errors.password = 'passwordTooShort'
  if (account.password !== draft.confirmPassword)
    errors.confirmPassword = 'passwordMismatch'
  return { errors, account: Object.keys(errors).length ? null : account }
}
