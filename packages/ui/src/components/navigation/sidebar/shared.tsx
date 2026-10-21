// SPDX-License-Identifier: 0BSD
import { type ReactElement, type ReactNode } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Button } from '@/components/inputs'
import { Box, Flex, Icon, Text } from '@/components/primitives'

import './sidebar.css'

function keyFor(label: string) {
  const words =
    label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[\p{L}\p{N}]+/gu) ?? []
  return words
    .map((word, i) =>
      i
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join('')
}

export function useSidebarLabel(namespace?: string | false) {
  const { t } = useModuleTranslation(
    namespace ? [namespace, 'common.sidebar'] : ['common.sidebar']
  )
  return (
    label: string | ReactElement,
    kind: 'item' | 'title' | 'app' = 'item',
    parent?: string
  ) => {
    if (namespace === false || typeof label !== 'string') return label
    const key = keyFor(label)
    const choices = [
      ...(parent
        ? [
            `apps.${parent}.subsections.${key}.title`,
            `apps.${keyFor(parent)}.subsections.${key}.title`
          ]
        : []),
      ...(kind === 'app' ? [`common.sidebar:apps.${label}.title`] : []),
      `sidebar.${key}`,
      ...(kind === 'title' ? [`common.sidebar:categories.${key}`] : []),
      label
    ]
    const qualified = namespace
      ? choices
          .filter(choice => !choice.includes(':'))
          .map(choice => namespace + ':' + choice)
      : []
    return t([...choices, ...qualified], { defaultValue: label })
  }
}

export function NavigationIcon({
  icon,
  className
}: {
  icon?: string | ReactElement
  className?: string
}) {
  if (!icon) return null
  if (typeof icon !== 'string') return icon
  const url = icon.startsWith('customHTML:')
    ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(icon.slice(11))
    : icon.startsWith('url:')
      ? icon.slice(4)
      : null
  return url ? (
    <Box
      as="img"
      src={url}
      alt=""
      aria-hidden
      className={className}
      width="1.25rem"
      height="1.25rem"
      flexShrink="0"
    />
  ) : (
    <Icon icon={icon} size="1.25rem" className={className} aria-hidden />
  )
}

export function NavigationRow({
  label,
  accessibleLabel,
  icon,
  active,
  count,
  sideStripColor,
  expanded,
  controls,
  onClick,
  tools,
  className,
  iconClassName,
  collapsed
}: {
  label: ReactNode
  accessibleLabel?: string
  icon?: string | ReactElement
  active?: boolean
  count?: number
  sideStripColor?: string
  expanded?: boolean
  controls?: string
  onClick?: () => void
  tools?: ReactNode
  className?: string
  iconClassName?: string
  collapsed?: boolean
}) {
  return (
    <Flex
      as="li"
      className={['sidebar-item', 'monolith-sidebar-item', className]
        .filter(Boolean)
        .join(' ')}
      align="center"
      gap="xs"
      data-active={active || undefined}
      minWidth="0"
    >
      <Flex
        as="button"
        role="button"
        type="button"
        className="monolith-sidebar-select"
        aria-label={accessibleLabel}
        aria-current={active ? 'page' : undefined}
        aria-expanded={expanded}
        aria-controls={controls}
        onClick={onClick}
        align="center"
        gap="sm"
        flex="1"
        minWidth="0"
        p="sm"
        r="sm"
        justify={collapsed ? 'center' : undefined}
      >
        {sideStripColor && (
          <Box
            as="span"
            aria-hidden
            width="3px"
            height="1.25rem"
            r="full"
            flexShrink="0"
            style={{ backgroundColor: sideStripColor }}
          />
        )}
        <NavigationIcon icon={icon} className={iconClassName} />
        {!collapsed && (
          <Box asChild flex="1" minWidth="0">
            <Text as="span" truncate align="left">
              {label}
            </Text>
          </Box>
        )}
        {count !== undefined && (
          <Text as="span" size="sm" color="muted">
            {count.toLocaleString()}
          </Text>
        )}
      </Flex>
      {tools}
    </Flex>
  )
}

export function ExpandButton({
  expanded,
  controls,
  label,
  onClick
}: {
  expanded: boolean
  controls: string
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="plain"
      p="xs"
      icon={expanded ? 'tabler:chevron-down' : 'tabler:chevron-right'}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    />
  )
}
