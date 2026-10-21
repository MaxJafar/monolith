// SPDX-License-Identifier: 0BSD
import { hash } from 'argon2'
import dayjs from 'dayjs'
import { z } from 'zod'

import { fileReferenceSchema } from '@monolith/file-storage'

import { verifyPassword } from '../../auth/utils/password'
import { accountFor, changeAccountImage, updateAccount } from '../account'
import endpoints from '../endpoints'

export const updateAvatar = endpoints
  .mutation({
    description: 'Replace the current account image',
    input: {},
    media: { file: { optional: false } },
    output: { OK: fileReferenceSchema }
  })
  .callback(async ({ db, res, core, media, response }) => {
    if (!media.file || typeof media.file === 'string')
      return response.badRequest('Choose an avatar image')
    const saved = await changeAccountImage({
      db,
      userId: res.locals.userId as string,
      storage: core.storage,
      field: 'avatar',
      file: media.file
    })
    return saved
      ? response.ok(saved)
      : response.badRequest('Image could not be saved')
  })
export const deleteAvatar = endpoints
  .mutation({
    description: 'Clear the current account image',
    input: {},
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, core, response }) => {
    await changeAccountImage({
      db,
      userId: res.locals.userId as string,
      storage: core.storage,
      field: 'avatar',
      remove: true
    })
    return response.noContent()
  })

const profileChanges = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/)
    .optional(),
  email: z.email().optional(),
  name: z.string().optional(),
  dateOfBirth: z.string().optional()
})
export const updateProfile = endpoints
  .mutation({
    description: 'Save selected account profile fields',
    input: { body: z.object({ data: profileChanges }) },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    const account = await accountFor(db, res.locals.userId as string)
    const values = Object.fromEntries(
      Object.entries(body.data).filter(([, value]) => !!value)
    ) as z.infer<typeof profileChanges>
    if (values.dateOfBirth) {
      const birthday = dayjs(values.dateOfBirth)
      if (!birthday.isValid())
        return response.badRequest('Invalid date of birth')
      values.dateOfBirth = birthday.format('YYYY-MM-DD')
    }
    if (Object.keys(values).length) await updateAccount(db, account.id, values)
    return response.noContent()
  })

export const updatePassword = endpoints
  .mutation({
    description: 'Change a password after verifying the current password',
    input: {
      body: z
        .object({
          oldPassword: z.string().min(1),
          password: z.string().min(8),
          passwordConfirm: z.string().min(8)
        })
        .refine(value => value.password === value.passwordConfirm, {
          path: ['passwordConfirm'],
          message: "Passwords don't match"
        })
    },
    output: { NO_CONTENT: true }
  })
  .callback(async ({ db, res, body, response }) => {
    const account = await accountFor(db, res.locals.userId as string)
    if (!account.auth_password_hash)
      return response.badRequest('User has no password set')
    if (
      !(await verifyPassword(account.auth_password_hash, body.oldPassword))
        .valid
    ) {
      return response.badRequest('Incorrect old password')
    }
    await updateAccount(db, account.id, {
      auth_password_hash: await hash(body.password, { type: 2 })
    })
    return response.noContent()
  })
