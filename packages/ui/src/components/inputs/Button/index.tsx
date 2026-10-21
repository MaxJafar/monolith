// SPDX-License-Identifier: 0BSD
import type { CSSProperties, ElementType, MouseEvent, ReactNode } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import {
  Box,
  Flex,
  type FlexProps,
  Icon,
  type IconProps,
  Text,
  type TextProps
} from '@/components/primitives'
import { settleElement } from '@/utils/elasticMotion'

import './button.css'

type ButtonOptions = {
  children?: ReactNode
  icon?: string
  iconPosition?: 'start' | 'end'
  iconProps?: Omit<IconProps, 'icon'>
  textProps?: Omit<TextProps, 'children'>
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'tertiary' | 'plain'
  dangerous?: boolean
  namespace?: string | false
  tProps?: Record<string, unknown>
  style?: CSSProperties
}
export type ButtonProps<T extends ElementType = 'button'> = Omit<
  FlexProps<T>,
  keyof ButtonOptions
> &
  ButtonOptions

function translationKeys(value: string, namespace: string) {
  const parts =
    value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[\p{L}\p{N}]+/gu) ?? []
  const camel = parts
    .map((part, i) =>
      i
        ? part[0].toUpperCase() + part.slice(1).toLowerCase()
        : part.toLowerCase()
    )
    .join('')
  return [
    `buttons.${camel}`,
    camel,
    value,
    ...['buttons.' + camel, camel, value].map(key => namespace + ':' + key),
    `common.buttons:buttons.${camel}`,
    `common.buttons:${camel}`,
    `common.buttons:${value}`
  ]
}

export function Button<T extends ElementType = 'button'>({
  children,
  icon,
  iconPosition = 'start',
  iconProps,
  textProps,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
  dangerous = false,
  namespace = 'common.buttons',
  tProps,
  className,
  as,
  ...rest
}: ButtonProps<T>) {
  const { t } = useModuleTranslation(namespace === false ? [] : [namespace])
  const blocked = loading || disabled
  const native = !as || as === 'button'
  const hasIcon = Boolean(icon)
  const label =
    typeof children === 'string' && namespace !== false
      ? t(translationKeys(children, namespace), {
          ...tProps,
          defaultValue: children
        })
      : children
  const glyph = hasIcon ? (
    <Icon
      {...iconProps}
      icon={loading ? 'svg-spinners:ring-resize' : icon!}
      aria-hidden
      color={iconProps?.color ?? 'inherit'}
    />
  ) : null
  return (
    <Flex<ElementType>
      as={as ?? 'button'}
      align="center"
      justify="center"
      gap="sm"
      flexShrink="0"
      minHeight={{ base: '44px', md: '34px' }}
      minWidth="0"
      position="relative"
      r="md"
      px={rest.p === undefined ? 'md' : undefined}
      py={rest.p === undefined ? 'sm' : undefined}
      {...rest}
      type={native ? (rest.type ?? 'button') : rest.type}
      disabled={native ? blocked : undefined}
      tabIndex={!native && blocked ? -1 : rest.tabIndex}
      className={['monolith-button', className].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
      aria-disabled={blocked || undefined}
      data-variant={variant}
      data-dangerous={dangerous || undefined}
      data-icon-only={(hasIcon && !children) || undefined}
      data-loading-without-icon={(loading && !hasIcon) || undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (blocked) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        if (event.currentTarget instanceof HTMLElement)
          settleElement(event.currentTarget, 0.65)
        return onClick?.(event)
      }}
    >
      {loading && !hasIcon && (
        <Flex
          centered
          position="absolute"
          inset="0"
          aria-hidden
          data-loading-indicator="true"
        >
          <Icon icon="svg-spinners:ring-resize" aria-hidden />
        </Flex>
      )}
      {iconPosition === 'start' && glyph}
      {typeof label === 'string' ? (
        <Box asChild minWidth="0">
          <Text as="span" truncate {...textProps}>
            {label}
          </Text>
        </Box>
      ) : (
        label
      )}
      {iconPosition === 'end' && glyph}
    </Flex>
  )
}
