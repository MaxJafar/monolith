import React from 'react'

import { surface } from '@/system/colors/surfaces'

import { Flex, type FlexProps } from '../../primitives'

export type CardProps<T extends React.ElementType = 'div'> = FlexProps<T> & {
  isInteractive?: boolean
}

export function Card<T extends React.ElementType = 'div'>({
  isInteractive,
  style,
  ...props
}: CardProps<T>) {
  return (
      <Flex
        direction="column"
        p="lg"
        position="relative"
        r="lg"
        {...(props as FlexProps<T>)}
        bg={
          typeof props.bg === 'string'
            ? props.bg
            : {
                ...(isInteractive
                  ? surface.defaultInteractive
                  : surface.default),
                ...props.bg
              }
        }
        style={{
          ...(isInteractive
            ? {
                cursor: 'pointer',
                transition:
                  'background-color var(--motion-fast, 140ms) var(--motion-ease, ease), color var(--motion-fast, 140ms) var(--motion-ease, ease), border-color var(--motion-fast, 140ms) var(--motion-ease, ease), box-shadow var(--motion-fast, 140ms) var(--motion-ease, ease), opacity var(--motion-fast, 140ms) var(--motion-ease, ease)'
              }
            : {}),
          ...style
        }}
      />
  )
}
