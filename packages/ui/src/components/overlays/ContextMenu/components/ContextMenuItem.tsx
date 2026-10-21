// SPDX-License-Identifier: 0BSD
import { Item } from '@radix-ui/react-dropdown-menu'
import { camelCase } from 'lodash'
import type { ReactElement } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Icon } from '@/components/primitives'

type Props = {
  label: string
  icon?: string | ReactElement
  dangerous?: boolean
  checked?: boolean
  disabled?: boolean
  loading?: boolean
  shouldCloseMenuOnClick?: boolean
  className?: string
  namespace?: string | false
  tProps?: Record<string, unknown>
  onClick: () => void
}
export function ContextMenuItem({
  label,
  icon,
  dangerous = false,
  checked = false,
  disabled = false,
  loading = false,
  shouldCloseMenuOnClick = true,
  className,
  namespace = 'common.buttons',
  tProps,
  onClick
}: Props) {
  const { t } = useModuleTranslation(namespace ? [namespace] : undefined)
  const key = camelCase(label)
  const text = namespace
    ? t(
        [
          key,
          'buttons.' + key,
          label,
          namespace + ':' + key,
          namespace + ':buttons.' + key,
          namespace + ':' + label
        ],
        tProps
      )
    : label
  const unavailable = disabled || loading
  const glyph = loading ? (
    <Icon icon="svg-spinners:ring-resize" aria-hidden="true" />
  ) : typeof icon === 'string' ? (
    <Icon icon={icon} aria-hidden="true" />
  ) : (
    icon
  )
  return (
    <Item
      disabled={unavailable}
      aria-busy={loading || undefined}
      aria-current={checked ? 'true' : undefined}
      data-dangerous={dangerous || undefined}
      data-checked={checked || undefined}
      className={['monolith-menu-item', className].filter(Boolean).join(' ')}
      onClick={event => event.stopPropagation()}
      onSelect={event => {
        if (unavailable || !shouldCloseMenuOnClick) event.preventDefault()
        if (!unavailable) onClick()
      }}
    >
      {glyph}
      <span className="monolith-menu-item-label">{text}</span>
      {checked && <Icon icon="tabler:check" aria-hidden="true" />}
    </Item>
  )
}
