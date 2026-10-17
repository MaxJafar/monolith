import {
  DatabaseLayoutPicker,
  type InlineDatabaseMode,
  Stack,
  Text
} from '@monolith/ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDatabases } from '@/DatabaseProvider'

export function BaseCreateMenu({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('common', { keyPrefix: 'inlineDatabase' })
  const { api, run, busy, readOnly, error, selectBase } = useDatabases()
  const [pending, setPending] = useState<InlineDatabaseMode | null>(null)
  const request = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function create(mode: InlineDatabaseMode) {
    if (request.current || busy || readOnly) return
    request.current = true
    setPending(mode)
    // The provider binds this contract to the current workspace atomically.
    const input = {
      name: t('newDatabase'),
      description: '',
      initial_view: mode,
      view_name: t(`modes.${mode}`)
    }
    const result = await run(() => api.createBase.mutate(input))
    request.current = false
    if (!mounted.current) return
    setPending(null)
    if (result) {
      selectBase(result.id)
      onDone()
    }
  }

  return (
    <Stack gap="sm" className="database-create-menu">
      <DatabaseLayoutPicker
        pending={pending}
        disabled={busy || readOnly}
        onSelect={mode => void create(mode)}
      />
      <Text size="sm" color="muted" px="sm" role="status">
        {t(pending ? 'creating' : 'createHint')}
      </Text>
      {error && (
        <Text role="alert" color="dangerous" size="sm" px="sm">
          {error}
        </Text>
      )}
    </Stack>
  )
}
