// SPDX-License-Identifier: 0BSD
import { formatHex, parse, wcagContrast } from 'culori'
import type {
  CSSProperties,
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactNode
} from 'react'

import {
  Bordered,
  type BorderedOwnProps,
  Flex,
  Icon,
  Text
} from '@/components/primitives'

import './tagChip.css'

type OwnProps = {
  label: ReactNode
  icon?: string
  color?: string
  size?: 'sm' | 'base'
  variant?: 'outlined' | 'filled'
  actionButtonProps?: {
    icon: string
    onClick?: () => void
    'aria-label'?: string
  }
  onClick?: (event: MouseEvent<HTMLSpanElement>) => void
}
type TagChipProps<T extends ElementType> = OwnProps &
  Omit<BorderedOwnProps, 'color' | 'as'> & { as?: T } & Omit<
    ComponentPropsWithoutRef<T>,
    keyof OwnProps | keyof BorderedOwnProps | 'as'
  >

export function TagChip<T extends ElementType = 'button'>({
  label,
  icon,
  color,
  size = 'base',
  variant = 'outlined',
  actionButtonProps,
  onClick,
  as,
  ...props
}: TagChipProps<T>) {
  const normalized = color ? formatHex(parse(color)) : undefined
  const text =
    normalized && variant === 'filled'
      ? wcagContrast(normalized, '#ffffff') >=
        wcagContrast(normalized, '#000000')
        ? '#ffffff'
        : '#000000'
      : color
  const style: CSSProperties = {
    borderColor: color
      ? 'color-mix(in srgb, ' + color + ' 30%, transparent)'
      : 'var(--border-medium)',
    background: color
      ? variant === 'filled'
        ? color
        : 'color-mix(in srgb, ' + color + ' 12%, transparent)'
      : variant === 'filled'
        ? 'var(--bg-lifted)'
        : 'transparent',
    color: text || 'var(--text-muted)',
    ...props.style
  }
  const element = as ?? (onClick ? 'button' : 'span')
  const body = (
    <Bordered
      {...props}
      as={element as ElementType}
      className={['monolith-tag-chip', props.className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...(element === 'button' ? { type: 'button' } : {})}
      px="sm"
      py="xs"
      r="full"
      display="inline-block"
      minWidth="0"
      onClick={onClick}
    >
      <Flex as="span" align="center" gap="xs" minWidth="0">
        {icon &&
          (icon.startsWith('customHTML:') ? (
            <img
              alt=""
              width={16}
              height={16}
              src={'data:image/svg+xml,' + encodeURIComponent(icon.slice(11))}
            />
          ) : (
            <Icon
              icon={icon}
              size={size === 'sm' ? '12px' : '15px'}
              aria-hidden
            />
          ))}
        <Text
          as="span"
          truncate
          size={size === 'sm' ? 'xs' : 'sm'}
          weight="medium"
        >
          {label}
        </Text>
      </Flex>
    </Bordered>
  )
  return actionButtonProps ? (
    <Flex as="span" display="inline-flex" align="center" gap="xs" minWidth="0">
      {body}
      <button
        type="button"
        className="monolith-tag-action"
        aria-label={
          actionButtonProps['aria-label'] ??
          (typeof label === 'string' ? 'Remove ' + label : 'Remove tag')
        }
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          actionButtonProps.onClick?.()
        }}
      >
        <Icon icon={actionButtonProps.icon} size="14px" aria-hidden />
      </button>
    </Flex>
  ) : (
    body
  )
}
