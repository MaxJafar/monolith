/** Sign-in providers are server-wide; workspace roles never grant changes. */
export const canManageSignIn = (id: string) =>
  !!id &&
  (process.env.MONOLITH_AUTH_ADMIN_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .includes(id)
