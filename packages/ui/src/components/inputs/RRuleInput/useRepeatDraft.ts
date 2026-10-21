// SPDX-License-Identifier: 0BSD
import { useMemo, useState } from 'react'

import {
  type RepeatDraft,
  decodeRepeat,
  emptyRepeat,
  encodeRepeat
} from './model'

export function useRepeatDraft(
  value: string,
  onChange: (value: string) => void,
  duration: boolean
) {
  const parsed = useMemo(() => decodeRepeat(value), [value])
  const [local, setLocal] = useState<{
    serialized: string
    draft: RepeatDraft
  } | null>(null)
  const ownsValue = local?.serialized === value
  const draft = ownsValue ? local.draft : (parsed ?? emptyRepeat())
  return {
    draft,
    structured: value === '' || !!parsed || ownsValue,
    change(patch: Partial<RepeatDraft>) {
      const next = { ...draft, ...patch }
      if (duration && !next.duration)
        next.duration = { duration_amt: 1, duration_unit: 'hour' }
      const serialized = encodeRepeat(next)
      setLocal({ serialized, draft: next })
      onChange(serialized)
    }
  }
}
