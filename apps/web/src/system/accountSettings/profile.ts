import { z } from 'zod'

export const profileFields = [
  { id: 'username', label: 'username', icon: 'tabler:user', type: 'text' },
  {
    id: 'name',
    label: 'displayName',
    icon: 'tabler:user-screen',
    type: 'text'
  },
  { id: 'email', label: 'email', icon: 'tabler:mail', type: 'email' },
  { id: 'dateOfBirth', label: 'dateOfBirth', icon: 'tabler:cake', type: 'date' }
] as const

export type ProfileField = (typeof profileFields)[number]['id']

export function profileSchema(field: ProfileField, message: string) {
  let value = z.string().trim().min(1, message)
  if (field === 'username') value = value.regex(/^[a-zA-Z0-9]+$/, message)
  if (field === 'email') value = value.email(message)

  if (field === 'dateOfBirth') {
    value = value.refine(input => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false

      const date = new Date(input + 'T00:00:00Z')

      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === input
      )
    }, message)
  }

  return z.object({ value })
}

export function passwordSchema(messages: {
  required: string
  length: string
  mismatch: string
}) {
  return z
    .object({
      oldPassword: z.string().min(1, messages.required),
      password: z.string().min(8, messages.length),
      passwordConfirm: z.string().min(1, messages.required)
    })
    .refine(values => values.password === values.passwordConfirm, {
      path: ['passwordConfirm'],
      message: messages.mismatch
    })
}
