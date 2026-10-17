import type { HTMLAttributes, Ref } from 'react'

import { Slot } from '../Slot'

type Entry = {
  property: string
  duration?: number | string
  easing?: string
  delay?: number | string
}
type Props = Omit<HTMLAttributes<HTMLElement>, 'property'> & {
  ref?: Ref<HTMLElement>
  duration?: number | string
  easing?: string
  delay?: number | string
  property?: string | Entry | Array<string | Entry>
}
const time = (value: number | string) =>
  typeof value === 'number' ? value + 'ms' : value

export function buildEntry(
  input: string | Entry,
  defaults: { duration: string; easing: string; delay?: string }
): string {
  const entry = typeof input === 'string' ? { property: input } : input
  const duration = time(entry.duration ?? defaults.duration)
  const delay = entry.delay === undefined ? defaults.delay : time(entry.delay)
  return [entry.property, duration, entry.easing ?? defaults.easing, delay]
    .filter(value => value !== undefined)
    .join(' ')
}

export function Transition({
  duration = 100,
  easing = 'ease-in-out',
  delay,
  property = 'all',
  children,
  style,
  ...native
}: Props) {
  const defaults = {
    duration: time(duration),
    easing,
    delay: delay === undefined ? undefined : time(delay)
  }
  const values = Array.isArray(property) ? property : [property]
  return (
    <Slot
      {...native}
      style={{
        transition: values.map(value => buildEntry(value, defaults)).join(', '),
        ...style
      }}
    >
      {children}
    </Slot>
  )
}
