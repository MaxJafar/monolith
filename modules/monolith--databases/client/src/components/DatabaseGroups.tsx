import { useModuleTranslation } from '@monolith/localization'
import { AnimatedCollapse, Button, Flex, Stack, Text } from '@monolith/ui'
import { type ReactNode, useMemo, useState } from 'react'

import { useDatabases } from '@/DatabaseProvider'
import { boardGroups, boardValues } from '@/utils/board'

import type { Field, RecordPage } from '../../../shared'

/** One grouping surface for table, gallery, list and board subgroups. */
export function DatabaseGroups({
  records,
  fields,
  children
}: {
  records: RecordPage[]
  fields: Field[]
  children: (records: RecordPage[]) => ReactNode
}) {
  const { t } = useModuleTranslation()
  const { data, index } = useDatabases()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const field = fields[0]
  const groups = useMemo(() => {
    if (!field) return []
    const buckets = new Map<unknown, RecordPage[]>()
    for (const record of records) {
      for (const key of boardValues(record, field, data.links)) {
        const bucket = buckets.get(key) ?? []
        bucket.push(record)
        buckets.set(key, bucket)
      }
    }
    return boardGroups(
      field,
      records,
      t,
      data.links,
      field.kind === 'relation'
        ? value => index.recordsById.get(value)?.title ?? value
        : undefined
    )
      .map(group => ({ ...group, records: buckets.get(group.value) ?? [] }))
      .filter(group => group.records.length)
  }, [field, records, t, data.links, index])
  if (!field || !records.length) return children(records)
  return (
    <Stack gap="md" minWidth="0">
      {groups.map(group => {
        const key = `${field.id}:${String(group.value)}`
        const closed = collapsed.has(key)
        return (
          <Stack
            as="section"
            key={key}
            gap="sm"
            minWidth="0"
            aria-label={`${field.name}: ${group.label}`}
          >
            <Flex align="center" gap="xs">
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:chevron-right"
                className="monolith-disclosure"
                aria-expanded={!closed}
                onClick={() =>
                  setCollapsed(current => {
                    const next = new Set(current)
                    if (next.has(key)) next.delete(key)
                    else next.add(key)
                    return next
                  })
                }
              >
                {group.label}
              </Button>
              <Text color="muted" size="sm">
                {group.records.length}
              </Text>
            </Flex>
            <AnimatedCollapse open={!closed}>
              <DatabaseGroups records={group.records} fields={fields.slice(1)}>
                {children}
              </DatabaseGroups>
            </AnimatedCollapse>
          </Stack>
        )
      })}
    </Stack>
  )
}
