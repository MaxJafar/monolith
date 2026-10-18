import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ChoiceSelect,
  DatabaseLayoutPicker,
  type InlineDatabaseMode,
  Stack,
  Text
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { type TableType, tableType } from '../../../shared'

export function BaseCreateMenu({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('common', { keyPrefix: 'inlineDatabase' })
  const { t: work } = useTranslation('common.workHub')
  const [type, setType] = useState<TableType>('general')
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
      table_type: type,
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
    <Stack className="database-create-menu" gap="sm">
      <Text color="muted" size="xs">
        {work('tableType')}
      </Text>
      <ChoiceSelect
        disabled={busy || readOnly || !!pending}
        label={work('tableType')}
        options={tableType.options.map(value => ({
          value,
          label: work(`tableTypes.${value}`)
        }))}
        value={type}
        onChange={value => setType(tableType.parse(value))}
      />
      <DatabaseLayoutPicker
        disabled={busy || readOnly}
        pending={pending}
        onSelect={mode => void create(mode)}
      />
      <Text color="muted" px="sm" role="status" size="sm">
        {t(pending ? 'creating' : 'createHint')}
      </Text>
      {error && (
        <Text color="dangerous" px="sm" role="alert" size="sm">
          {error}
        </Text>
      )}
    </Stack>
  )
}
