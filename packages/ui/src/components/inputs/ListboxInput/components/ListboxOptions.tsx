import { ListboxOptions as HeadlessListboxOptions } from '@headlessui/react'

import { Bordered, Text } from '@/components/primitives'
import {
  appearanceVariables,
  useAppearance
} from '@/providers/AppearanceProvider'
import { usePersonalization } from '@/providers/PersonalizationProvider'

import * as styles from './ListboxOptions.css'

export function ListboxOptions({
  children,
  customWidth,
  lighter = false,
  portal = true
}: {
  children: React.ReactNode
  customWidth?: string
  lighter?: boolean
  portal?: boolean
}) {
  const { appearance } = useAppearance()
  const { derivedTheme } = usePersonalization()
  return (
    <Text asChild color="muted" size="base">
      <Bordered
        asChild
        shadow
        bg={{ base: lighter ? 'bg-50' : 'bg-100', dark: 'bg-800' }}
        className={`${styles.options} monolith-listbox-surface`}
        overflowY="auto"
        position={!portal ? 'absolute' : undefined}
        r="md"
        style={{
          ...appearanceVariables(appearance, derivedTheme),
          // @ts-expect-error - headlessui CSS variable
          '--anchor-gap': '4px',
          width: customWidth ?? 'var(--button-width)',
          ...(!portal && {
            top: 'calc(var(--spacing) * 22)',
            left: 0
          })
        }}
        zIndex="9999"
      >
        <HeadlessListboxOptions
          transition
          anchor={portal ? 'bottom start' : undefined}
          portal={portal}
          onMouseDown={e => {
            e.stopPropagation()
          }}
        >
          {children}
        </HeadlessListboxOptions>
      </Bordered>
    </Text>
  )
}
