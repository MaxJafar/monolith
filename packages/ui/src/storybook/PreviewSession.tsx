// SPDX-License-Identifier: 0BSD
import type { ContextType, ReactNode } from 'react'

import { AuthContext } from '@monolith/api'

const unavailable = async (): Promise<never> => {
  throw new Error('Sign-in is unavailable in a component preview')
}
const session: NonNullable<ContextType<typeof AuthContext>> = {
  auth: false,
  authLoading: false,
  userData: null,
  tid: { current: '' },
  setAuth: () => {},
  setUserData: () => {},
  getAvatarURL: () => '',
  logout: async () => {},
  authenticate: unavailable,
  verifyOAuth: unavailable,
  authenticateWith2FA: unavailable
}
export function PreviewSession({ children }: { children: ReactNode }) {
  return <AuthContext value={session}>{children}</AuthContext>
}
