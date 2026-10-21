// SPDX-License-Identifier: 0BSD
import type { CSSProperties, HTMLAttributes, Ref } from 'react'

import { Slot } from '../Slot'
import './transition.css'

type Timing = {
  duration?: number | string
  easing?: string
  delay?: number | string
}
type Entry = Timing & { property: string }
export type TransitionProps = Omit<HTMLAttributes<HTMLElement>, 'property'> &
  Timing & {
    ref?: Ref<HTMLElement>
    property?: string | Entry | Array<string | Entry>
  }
const durationText = (value: string | number) =>
  typeof value === 'number' ? value + 'ms' : value
export function buildEntry(
  entry: string | Entry,
  defaults: { duration: string; easing: string; delay?: string }
): string {
  const values = {
    ...defaults,
    ...(typeof entry === 'string' ? { property: entry } : entry)
  }
  return [
    values.property,
    durationText(values.duration),
    values.easing,
    values.delay == null ? undefined : durationText(values.delay)
  ]
    .filter(value => value !== undefined)
    .join(' ')
}
export function Transition({
  property = 'all',
  duration = 100,
  easing = 'ease-in-out',
  delay,
  className,
  style,
  children,
  ...element
}: TransitionProps) {
  const defaults = {
    duration: durationText(duration),
    easing,
    delay: delay == null ? undefined : durationText(delay)
  }
  const transitions = (Array.isArray(property) ? property : [property]).map(
    entry => buildEntry(entry, defaults)
  )
  return (
    <Slot
      {...element}
      className={['monolith-transition', className].filter(Boolean).join(' ')}
      style={
        {
          '--monolith-transition': transitions.join(', '),
          ...style
        } as CSSProperties
      }
    >
      {children}
    </Slot>
  )
}
