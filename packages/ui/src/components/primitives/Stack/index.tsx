// SPDX-License-Identifier: 0BSD
import type { ElementType } from 'react'

import { Flex, type FlexProps } from '../Flex'

/** A vertical surface; explicit caller props always take precedence. */
export function Stack<T extends ElementType = 'div'>({
  direction = 'column',
  gap = 'sm',
  minWidth = '0',
  width = '100%',
  ...rest
}: FlexProps<T>) {
  return (
    <Flex<T>
      {...(rest as FlexProps<T>)}
      direction={direction}
      gap={gap}
      minWidth={minWidth}
      width={width}
    />
  )
}
