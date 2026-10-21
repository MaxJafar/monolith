// SPDX-License-Identifier: 0BSD
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'

import { useAuth } from '@monolith/api'
import { type IBackdropFilters, toast, usePersonalization } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'
import { readDashboardLayout } from '@/system/dashboard/utils/layout'

import {
  type AccountPreferences,
  UserPersonalizationContext
} from './UserPersonalizationContext'

export { useUserPersonalization } from './UserPersonalizationContext'

export default function UserPersonalizationProvider({
  children
}: {
  children: ReactNode
}) {
  const { userData, setUserData } = useAuth()
  const appearance = usePersonalization()
  const latest = useRef({ appearance, userData, setUserData })
  latest.current = { appearance, userData, setUserData }
  const pending = useRef(new Map<string, object>())
  const queue = useRef(Promise.resolve())
  const rollback = useRef(new Map<string, () => void>())
  const session = useRef({})
  const mounted = useRef(true)
  const owner = userData?.id
  useEffect(() => {
    mounted.current = true
    session.current = {}
    pending.current.clear()
    rollback.current.clear()
    return () => {
      mounted.current = false
      pending.current.clear()
    }
  }, [owner])

  const save = useCallback(
    async (
      field: string,
      value: unknown,
      preview: () => void,
      restore: () => void
    ) => {
      const id = latest.current.userData?.id
      if (!id) return
      const operation = {}
      const origin = session.current
      const isCurrent = () =>
        mounted.current &&
        session.current === origin &&
        latest.current.userData?.id === id
      if (!pending.current.has(field)) rollback.current.set(field, restore)
      pending.current.set(field, operation)
      preview()
      const write = queue.current.then(async () => {
        if (!isCurrent()) return
        await workspaceAPI.user.personalization.updatePersonalization.mutate({
          data: { [field]: value }
        })
      })
      queue.current = write.catch(() => {})
      try {
        await write
        if (!isCurrent()) return
        rollback.current.set(field, preview)
        if (pending.current.get(field) === operation) {
          pending.current.delete(field)
          rollback.current.delete(field)
        }
        latest.current.setUserData(previous =>
          previous?.id === id ? { ...previous, [field]: value } : previous
        )
      } catch {
        if (isCurrent() && pending.current.get(field) === operation) {
          pending.current.delete(field)
          rollback.current.get(field)?.()
          rollback.current.delete(field)
          toast.error('Could not save account preferences. Please try again.')
        }
      }
    },
    []
  )

  const actions = useMemo<AccountPreferences>(
    () => ({
      changeTheme(value) {
        const ui = latest.current.appearance
        return save(
          'theme',
          value,
          () => ui.setTheme(value),
          () => ui.setTheme(ui.theme)
        )
      },
      changeThemeColor(value) {
        const ui = latest.current.appearance
        return save(
          'color',
          value.replace(/^theme-/, ''),
          () => ui.setRawThemeColor(value),
          () => ui.setRawThemeColor(ui.rawThemeColor)
        )
      },
      changeBgTemp(value) {
        const ui = latest.current.appearance
        return save(
          'bgTemp',
          value.replace(/^bg-/, ''),
          () => ui.setBgTemp(value),
          () => ui.setBgTemp(ui.bgTemp)
        )
      },
      changeBackdropFilters(value) {
        const ui = latest.current.appearance
        return save(
          'backdropFilters',
          value,
          () => ui.setBackdropFilters(value),
          () => ui.setBackdropFilters(ui.backdropFilters)
        )
      },
      changeLanguage(value) {
        const ui = latest.current.appearance
        return save(
          'language',
          value,
          () => ui.setLanguage(value),
          () => ui.setLanguage(ui.language)
        )
      },
      changeFontFamily(value) {
        const ui = latest.current.appearance
        return save(
          'fontFamily',
          value,
          () => ui.setFontFamily(value),
          () => ui.setFontFamily(ui.fontFamily)
        )
      },
      changeFontScale(value) {
        const ui = latest.current.appearance
        return save(
          'fontScale',
          value,
          () => ui.setFontScale(value),
          () => ui.setFontScale(ui.fontScale)
        )
      },
      changeDashboardLayout(value) {
        const ui = latest.current.appearance
        return save(
          'dashboardLayout',
          value,
          () => ui.setDashboardLayout(value),
          () => ui.setDashboardLayout(ui.dashboardLayout)
        )
      },
      changeBorderRadiusMultiplier(value) {
        const ui = latest.current.appearance
        return save(
          'borderRadiusMultiplier',
          value,
          () => ui.setBorderRadiusMultiplier(value),
          () => ui.setBorderRadiusMultiplier(ui.borderRadiusMultiplier)
        )
      },
      changeBordered(value) {
        const ui = latest.current.appearance
        return save(
          'bordered',
          value,
          () => ui.setBordered(value),
          () => ui.setBordered(ui.bordered)
        )
      }
    }),
    [save]
  )

  useEffect(() => {
    if (!userData) return
    const ui = latest.current.appearance
    const apply = (field: string, update: () => void) => {
      if (!pending.current.has(field)) update()
    }
    if (['light', 'dark', 'system'].includes(userData.theme))
      apply('theme', () =>
        ui.setTheme(userData.theme as 'light' | 'dark' | 'system')
      )
    if (userData.color && userData.color !== '#f58a38')
      apply('color', () =>
        ui.setRawThemeColor(
          userData.color!.startsWith('#')
            ? userData.color!
            : 'theme-' + userData.color
        )
      )
    if (userData.bgTemp)
      apply('bgTemp', () =>
        ui.setBgTemp(
          userData.bgTemp!.startsWith('#')
            ? userData.bgTemp!
            : 'bg-' + userData.bgTemp
        )
      )
    if (userData.backdropFilters)
      apply('backdropFilters', () =>
        ui.setBackdropFilters(userData.backdropFilters as IBackdropFilters)
      )
    if (userData.dashboardLayout)
      apply('dashboardLayout', () =>
        ui.setDashboardLayout(readDashboardLayout(userData.dashboardLayout))
      )
    if (userData.fontFamily)
      apply('fontFamily', () => ui.setFontFamily(userData.fontFamily!))
    if (userData.language)
      apply('language', () => ui.setLanguage(userData.language))
    apply('fontScale', () => ui.setFontScale(userData.fontScale))
    apply('borderRadiusMultiplier', () =>
      ui.setBorderRadiusMultiplier(userData.borderRadiusMultiplier)
    )
    apply('bordered', () => ui.setBordered(userData.bordered))
    ui.setBgImage(
      userData.bgImage
        ? workspaceAPI.getMedia({ key: userData.bgImage.key })
        : ''
    )
  }, [userData])
  return (
    <UserPersonalizationContext value={actions}>
      {children}
    </UserPersonalizationContext>
  )
}
