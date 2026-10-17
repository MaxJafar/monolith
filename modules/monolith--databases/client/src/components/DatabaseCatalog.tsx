import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'

import { BaseEditor } from './BaseEditor'
import { DatabaseName } from './DatabaseName'
import { DatabasePanel } from './DatabasePanel'

/** Inline databases and full-page databases share the same workspace registry. */
export function DatabaseCatalog() {
  const { data, index, readOnly, busy } = useDatabases()
  const { t } = useTranslation('common.systemViews')
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
      <Flex align="start" justify="between" gap="md" wrap="wrap">
        <Stack gap="xs" flex="1" width="auto" minWidth="220px">
          <Text as="h1" size="3xl" weight="semibold">
            {t('titles.databases')}
          </Text>
          <Text color="muted">{t('catalogHelp')}</Text>
        </Stack>
        <Button
          namespace={false}
          icon="lucide:plus"
          disabled={readOnly || busy}
          onClick={event => setCreating(creating ? null : event.currentTarget)}
        >
          {t('newDatabase')}
        </Button>
      </Flex>
      <Flex gap="sm" align="center" wrap="wrap">
        <Box
          as="input"
          type="search"
          className="monolith-system-input"
          aria-label={t('searchDatabases')}
          placeholder={t('searchDatabases')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <ChoiceSelect
          label={t('sort')}
          value={sort}
          onChange={setSort}
          options={['name', 'updated', 'records'].map(value => ({
            value,
            label: t(`catalogSort.${value}`)
          }))}
        />
        <Text size="sm" color="muted">
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
          className="zillion-database-table monolith-database-catalog"
          aria-label={t('titles.databases')}
        >
          <thead>
            <tr>
              {[
                'database',
                'description',
                'records',
                'properties',
                'views'
              ].map(key => (
                <th scope="col" key={key}>
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bases.map(base => (
              <tr key={base.id}>
                <td>
                  <DatabaseName
                    base={base}
                    href={`?${new URLSearchParams({ workspace: params.get('workspace') ?? base.workspace_id ?? '', base: base.id })}`}
                  />
                </td>
                <td>
                  <Text size="sm" color="muted" lineClamp={2}>
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
                          to={`?${new URLSearchParams({ workspace: params.get('workspace') ?? base.workspace_id ?? '', base: base.id, view: view.id })}`}
                          namespace={false}
                          variant="plain"
                          p="xs"
                          className="monolith-system-chip"
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
          <Icon icon="lucide:database" size="2rem" color="muted" />
          <Text color="muted">{t(query ? 'noMatches' : 'noDatabases')}</Text>
        </Stack>
      )}
    </Stack>
  )
}
