// SPDX-License-Identifier: 0BSD
import { ListboxOptions as Options } from '@headlessui/react'
import type { CSSProperties, ReactNode } from 'react'

import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import { menu } from '../../shared/components/choice.css'

export function ListboxOptions({
  children,
  customWidth,
  compact,
  lighter,
  portal = true
}: {
  children: ReactNode
  customWidth?: string
  compact?: boolean
  lighter?: boolean
  portal?: boolean
}) {
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  const styles = {
    ...appearanceVariables(appearance, derivedTheme),
    '--anchor-gap': '4px',
    width:
      customWidth ??
      (compact
        ? 'max(180px, min(var(--button-width), 320px))'
        : 'var(--button-width)'),
    color: 'var(--text-primary)',
    backgroundColor: lighter ? 'var(--bg-primary)' : 'var(--bg-surface)'
  } as CSSProperties
  return (
    <Options
      anchor="bottom start"
      portal={portal}
      transition
      modal={false}
      style={styles}
      className={[
        menu,
        'monolith-listbox-surface',
        compact ? 'monolith-choice-menu' : ''
      ].join(' ')}
      onMouseDown={event => event.stopPropagation()}
    >
      {children}
    </Options>
  )
}
