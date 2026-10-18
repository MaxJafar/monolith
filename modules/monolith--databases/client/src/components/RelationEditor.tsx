import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack, Text } from '@monolith/ui'
import { useEffect, useMemo, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { sameRecordIds } from '@/utils/navigation'

import type { Field, RecordPage } from '../../../shared'

export function RelationEditor({
  field,
  record,
  onDirtyChange
}: {
  field: Field
  record: RecordPage
  onDirtyChange: (id: string, dirty: boolean) => void
}) {
  const {
    api: workspaceAPI,
    index,
    run,
    busy,
    readOnly,
    openRecord,
    retry
  } = useDatabases()
  const { t } = useModuleTranslation()
  const [query, setQuery] = useState('')

  const persisted = (
    index.linksByField.get(field.id)?.get(record.id) ?? []
  ).map(link => link.target_record_id)

  const [draft, setDraft] = useState<{
    selected: string[]
    baseline: string[]
  } | null>(null)
  const selected = draft?.selected ?? persisted

  const selectedIds = useMemo(() => new Set(selected), [selected])

  const changedElsewhere = !!draft && !sameRecordIds(persisted, draft.baseline)
  const dirty = !!draft && !sameRecordIds(selected, persisted)

  useEffect(() => {
    onDirtyChange(field.id, dirty)
  }, [field.id, dirty, onDirtyChange])
  useEffect(
    () => () => onDirtyChange(field.id, false),
    [field.id, onDirtyChange]
  )

  const targets = (
    index.recordsByBase.get(field.target_base_id ?? '') ?? []
  ).filter(target => target.id !== record.id)

  function toggle(id: string, checked: boolean) {
    setDraft(previous => {
      const ids = previous?.selected ?? persisted

      return {
        baseline: previous?.baseline ?? persisted,
        selected: checked
          ? field.config.cardinality === 'one'
            ? [id]
            : [...new Set([...ids, id])]
          : ids.filter(value => value !== id)
      }
    })
  }

  return (
    <Stack gap="xs" className="database-relation-picker">
      <input
        className="database-value-input"
        type="search"
        aria-label={t('searchRelationPages')}
        placeholder={t('searchRelationPages')}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <Text size="xs" color="muted" px="sm" py="xs">
        {index.basesById.get(field.target_base_id ?? '')?.name}
      </Text>
      <Stack gap="xs" maxHeight="16rem" overflowY="auto">
        {targets
          .filter(target =>
            target.title.toLowerCase().includes(query.toLowerCase())
          )
          .map(target => (
            <Flex
              key={target.id}
              align="center"
              gap="sm"
              justify="between"
              className="database-relation-option"
            >
              <label className="database-checkbox-option">
                <input
                  type="checkbox"
                  checked={selectedIds.has(target.id)}
                  disabled={busy || readOnly}
                  onChange={e => toggle(target.id, e.target.checked)}
                />
                <span>{target.title}</span>
              </label>
              <Button
                aria-label={t('openLinkedRecord')}
                icon="tabler:arrow-up-right"
                variant="plain"
                onClick={() => openRecord(target)}
              />
            </Flex>
          ))}
        {!targets.length && <Text color="muted">{t('noRelationTargets')}</Text>}
      </Stack>
      {changedElsewhere && (
        <Text color="dangerous" role="alert">
          {t('relationsChanged')}
        </Text>
      )}
      {changedElsewhere && (
        <Button
          disabled={busy}
          namespace={false}
          variant="plain"
          onClick={() => {
            setDraft(null)
            retry()
          }}
        >
          {t('reloadRelations')}
        </Button>
      )}
      <Button
        disabled={changedElsewhere || !dirty || readOnly}
        loading={busy}
        variant="plain"
        onClick={() => {
          void run(async () => {
            await workspaceAPI.setLinks.mutate({
              field_id: field.id,
              record_id: record.id,
              target_ids: selected,
              expected_ids: draft?.baseline ?? persisted
            })

            return true
          }).then(saved => {
            if (saved) setDraft(null)
          })
        }}
      >
        saveRelations
      </Button>
    </Stack>
  )
}
