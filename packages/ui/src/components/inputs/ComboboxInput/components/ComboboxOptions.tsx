// SPDX-License-Identifier: 0BSD
import { ComboboxOptions as Options } from '@headlessui/react'
import type { CSSProperties, ReactNode } from 'react'

import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import { menu } from '../../shared/components/choice.css'

export function ComboboxOptions({
  children,
  customWidth
}: {
  children: ReactNode
  customWidth?: string
}) {
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  return (
    <Options
      portal
      anchor="bottom start"
      transition
      modal={false}
      className={menu}
      style={
        {
          ...appearanceVariables(appearance, derivedTheme),
          '--anchor-gap': '4px',
          width: customWidth ?? 'max(14rem, var(--input-width))',
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-surface)'
        } as CSSProperties
      }
    >
      {children}
    </Options>
  )
}
