// SPDX-License-Identifier: 0BSD
import { createContext, useContext } from 'react'

import type { IBackdropFilters, IDashboardLayout } from '@monolith/ui'

type Change<T> = (value: T) => Promise<void>
export interface AccountPreferences {
  changeTheme: Change<'light' | 'dark' | 'system'>
  changeThemeColor: Change<string>
  changeBgTemp: Change<string>
  changeBackdropFilters: Change<IBackdropFilters>
  changeLanguage: Change<string>
  changeFontFamily: Change<string>
  changeFontScale: Change<number>
  changeDashboardLayout: Change<IDashboardLayout>
  changeBorderRadiusMultiplier: Change<number>
  changeBordered: Change<boolean>
}
export const UserPersonalizationContext =
  createContext<AccountPreferences | null>(null)
export function useUserPersonalization(): AccountPreferences {
  const actions = useContext(UserPersonalizationContext)
  if (!actions)
    throw new Error('Account preferences require UserPersonalizationProvider')
  return actions
}
