// SPDX-License-Identifier: 0BSD
import { parseAsStringEnum, useQueryState } from 'nuqs'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

export type ChoiceState<T extends string> = {
  value: T
  change: (value: T) => void
}
export type ChoiceRootProps<T extends string> = {
  choices: readonly T[]
  initial?: T
  value?: T
  onChange?: (value: T) => void
  queryKey?: string
  storageKey?: string
  children: (state: ChoiceState<T>) => ReactNode
}

function initialChoice<T extends string>({
  choices,
  initial,
  storageKey
}: ChoiceRootProps<T>): T {
  if (!choices.length)
    throw new Error('A view requires at least one selectable option.')
  try {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      const found = choices.find(value => value === stored)
      if (found !== undefined) return found
    }
  } catch {
    /* Storage is optional. */
  }
  return initial !== undefined && choices.includes(initial)
    ? initial
    : choices[0]
}

function useBinding<T extends string>(
  props: ChoiceRootProps<T>,
  fallback: T,
  current: T,
  write: (value: T) => unknown
): ChoiceState<T> {
  const { choices, value: controlled, onChange, storageKey } = props
  const candidate = controlled ?? current
  const value = choices.includes(candidate)
    ? candidate
    : choices.includes(fallback)
      ? fallback
      : choices[0]
  const change = useCallback(
    (next: T) => {
      if (!choices.includes(next)) return
      if (controlled === undefined) void write(next)
      onChange?.(next)
    },
    [choices, controlled, onChange, write]
  )
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      /* Optional preference. */
    }
  }, [storageKey, value])
  return useMemo(() => ({ value, change }), [value, change])
}

function MemoryChoice<T extends string>(props: ChoiceRootProps<T>) {
  const [initial] = useState(() => initialChoice(props))
  const [value, change] = useState(initial)
  return props.children(useBinding(props, initial, value, change))
}
function UrlChoice<T extends string>(
  props: ChoiceRootProps<T> & { queryKey: string }
) {
  const [initial] = useState(() => initialChoice(props))
  const parser = useMemo(
    () => parseAsStringEnum([...props.choices]).withDefault(initial),
    [props.choices, initial]
  )
  const [value, change] = useQueryState(props.queryKey, parser)
  return props.children(useBinding(props, initial, value, change))
}

/** URL hooks live in a separate component so local views do not need a router adapter. */
export function ChoiceRoot<T extends string>(props: ChoiceRootProps<T>) {
  const identity = props.storageKey ?? 'session'
  return props.queryKey ? (
    <UrlChoice key={identity} {...props} queryKey={props.queryKey} />
  ) : (
    <MemoryChoice key={identity} {...props} />
  )
}
