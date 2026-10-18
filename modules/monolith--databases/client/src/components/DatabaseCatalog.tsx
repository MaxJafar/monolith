import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Text
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'

import { BaseEditor } from './BaseEditor'
import { DatabaseName } from './DatabaseName'
import { DatabasePanel } from './DatabasePanel'

/** Inline databases and full-page databases share the same workspace registry. */
export function DatabaseCatalog() {
  const { data, index, readOnly, busy } = useDatabases()
  const { t } = useTranslation('common.systemViews')
  const { t: work } = useTranslation('common.workHub')
  const [params] = useSearchParams()

  const [query, setQuery] = useState(''),
    [creating, setCreating] = useState<HTMLElement | null>(null),
    [sort, setSort] = useState('name')
  const bases = data.bases
    .filter(base =>
      `${base.name} ${base.description}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'records'
          ? (index.recordsByBase.get(b.id)?.length ?? 0) -
            (index.recordsByBase.get(a.id)?.length ?? 0)
          : Math.max(
              0,
              ...(index.recordsByBase.get(b.id) ?? []).map(record =>
                Date.parse(record.updated)
              )
            ) -
            Math.max(
              0,
              ...(index.recordsByBase.get(a.id) ?? []).map(record =>
                Date.parse(record.updated)
              )
            )
    )

  return (
    <Stack gap="lg" minWidth="0">
      <Flex align="start" gap="md" justify="between" wrap="wrap">
        <Stack flex="1" gap="xs" minWidth="220px" width="auto">
          <Text as="h1" size="3xl" weight="semibold">
            {t('titles.databases')}
          </Text>
          <Text color="muted">{t('catalogHelp')}</Text>
        </Stack>
        <Button
          disabled={readOnly || busy}
          icon="lucide:plus"
          namespace={false}
          onClick={event => setCreating(creating ? null : event.currentTarget)}
        >
          {t('newDatabase')}
        </Button>
      </Flex>
      <Flex align="center" gap="sm" wrap="wrap">
        <Box
          aria-label={t('searchDatabases')}
          as="input"
          className="monolith-system-input"
          placeholder={t('searchDatabases')}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <ChoiceSelect
          label={t('sort')}
          options={['name', 'updated', 'records'].map(value => ({
            value,
            label: t(`catalogSort.${value}`)
          }))}
          value={sort}
          onChange={setSort}
        />
        <Text color="muted" size="sm">
          {t('count', { count: bases.length })}
        </Text>
      </Flex>
      {creating && (
        <DatabasePanel
          anchor={creating}
          title={t('newDatabase')}
          width={360}
          onClose={() => setCreating(null)}
        >
          <BaseEditor onDone={() => setCreating(null)} />
        </DatabasePanel>
      )}
      <Box overflowX="auto">
        <table
          aria-label={t('titles.databases')}
          className="zillion-database-table monolith-database-catalog"
        >
          <thead>
            <tr>
              <th scope="col">{work('tableType')}</th>
              {[
                'database',
                'description',
                'records',
                'properties',
                'views'
              ].map(key => (
                <th key={key} scope="col">
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bases.map(base => (
              <tr key={base.id}>
                <td>
                  <Text color="muted" size="sm">
                    {work(`tableTypes.${base.table_type ?? 'general'}`)}
                  </Text>
                </td>
                <td>
                  <DatabaseName
                    base={base}
                    href={`?${new URLSearchParams({ workspace: params.get('workspace') ?? base.workspace_id ?? '', base: base.id })}`}
                  />
                </td>
                <td>
                  <Text color="muted" lineClamp={2} size="sm">
                    {base.description || '—'}
                  </Text>
                </td>
                <td>{index.recordsByBase.get(base.id)?.length ?? 0}</td>
                <td>{index.fieldsByBase.get(base.id)?.length ?? 0}</td>
                <td>
                  <Flex gap="xs" wrap="wrap">
                    {data.views
                      .filter(view => view.base_id === base.id)
                      .map(view => (
                        <Button
                          key={view.id}
                          as={Link}
                          className="monolith-system-chip"
                          namespace={false}
                          p="xs"
                          to={`?${new URLSearchParams({ workspace: params.get('workspace') ?? base.workspace_id ?? '', base: base.id, view: view.id })}`}
                          variant="plain"
                        >
                          {view.name}
                        </Button>
                      ))}
                  </Flex>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      {!bases.length && (
        <Stack align="center" gap="sm" py="xl">
          <Icon color="muted" icon="lucide:database" size="2rem" />
          <Text color="muted">{t(query ? 'noMatches' : 'noDatabases')}</Text>
        </Stack>
      )}
    </Stack>
  )
}
