import { useEffect, useMemo, useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Button, Checkbox, Flex, Stack, Text } from '@lifeforge/ui'

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
  const { api: forgeAPI, index, run, busy, openRecord, retry } = useDatabases()
  const { t } = useModuleTranslation()

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
    <Stack bg={{ base: 'bg-100', dark: 'bg-800' }} gap="sm" p="md" r="lg">
      <Text weight="semibold">
        {field.name} · {t(`cardinality.${field.config.cardinality}`)}
      </Text>
      <Text color="muted">
        {index.basesById.get(field.target_base_id ?? '')?.name}
      </Text>
      <Stack gap="sm" maxHeight="20rem" overflowY="auto">
        {targets.map(target => (
          <Flex
            key={target.id}
            align="center"
            gap="sm"
            justify="between"
            minHeight="44px"
          >
            <Flex align="center" gap="sm" minHeight="44px">
              <Checkbox
                checked={selectedIds.has(target.id)}
                disabled={busy}
                label={target.title}
                onCheckedChange={checked => toggle(target.id, checked)}
              />
            </Flex>
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
      <Button
        disabled={changedElsewhere || !dirty}
        icon="tabler:link"
        loading={busy}
        variant="secondary"
        onClick={() => {
          void run(async () => {
            await forgeAPI.setLinks.mutate({
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
