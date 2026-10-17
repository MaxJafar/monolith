import { useEffect, useRef, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { type ViewInput, mergeViewEdit } from '@/utils/viewEdits'

import { numericKinds } from '../../../computed'
import {
  type Field,
  type SavedView,
  type ViewConfig,
  isISODate,
  viewConfigSchema
} from '../../../shared'

const pendingViews = new Map<string, Promise<unknown>>()
export async function serializeView<T>(
  id: string,
  action: () => Promise<T>
): Promise<T> {
  const task = (pendingViews.get(id) ?? Promise.resolve())
    .catch(() => undefined)
    .then(action)
  pendingViews.set(id, task)
  try {
    return await task
  } finally {
    if (pendingViews.get(id) === task) pendingViews.delete(id)
  }
}

export function filtersReady(config: ViewConfig, fields: Field[]) {
  return [
    ...config.filters,
    ...(config.filter_groups ?? []).flatMap(group => group.filters)
  ].every(filter => {
    if (['empty', 'not-empty'].includes(filter.operator)) return true
    const kind =
      fields.find(field => field.id === filter.field_id)?.kind ?? 'text'
    if (filter.value == null) return false
    if (filter.operator === 'relative-date') return true
    if (['date', 'created-time', 'last-edited-time'].includes(kind))
      return isISODate(filter.value)
    if (numericKinds.has(kind))
      return typeof filter.value === 'number' && Number.isFinite(filter.value)
    if (Array.isArray(filter.value)) return filter.value.length > 0
    if (
      [
        'select',
        'status',
        'multi-select',
        'relation',
        'person',
        'created-by',
        'last-edited-by'
      ].includes(kind)
    )
      return filter.value !== ''
    return true
  })
}

/** Serialize view edits so slower requests cannot overwrite newer choices. */
export function useViewAutosave(
  view: SavedView | undefined,
  input: ViewInput,
  valid = true
) {
  const { api, run } = useDatabases()
  const fingerprint = JSON.stringify(input)
  const saved = useRef(fingerprint)
  const previous = useRef(input)
  const saving = useRef(false)
  const latest = useRef({ input, fingerprint, valid, api, run, view })
  latest.current = { input, fingerprint, valid, api, run, view }
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const mounted = useRef(true)
  const flush = async () => {
    if (saving.current) return
    saving.current = true
    if (mounted.current) setPending(true)
    try {
      while (
        latest.current.view &&
        latest.current.valid &&
        saved.current !== latest.current.fingerprint
      ) {
        const next = latest.current
        const result = await next.run(() =>
          serializeView(next.view!.id, async () => {
            const current = (await next.api.snapshot.query()).views.find(
              view => view.id === next.view!.id
            )
            if (!current) throw Error('View is unavailable')
            const merged = mergeViewEdit(current, previous.current, next.input)
            return next.api.updateView.input({ id: current.id }).mutate({
              ...merged,
              config: viewConfigSchema.parse(merged.config)
            })
          })
        )
        if (!result) {
          if (mounted.current) setFailed(true)
          break
        }
        saved.current = next.fingerprint
        previous.current = next.input
        if (mounted.current) setFailed(false)
      }
    } finally {
      saving.current = false
      if (mounted.current) setPending(false)
    }
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => {
    if (!view || !valid || saved.current === fingerprint) return
    const timer = setTimeout(() => void flushRef.current(), 400)
    return () => clearTimeout(timer)
  }, [view?.id, fingerprint, valid])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      void flushRef.current()
    }
  }, [])
  return { pending, failed, retry: () => void flushRef.current() }
}
