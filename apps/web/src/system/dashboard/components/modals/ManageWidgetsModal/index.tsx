// SPDX-License-Identifier: 0BSD
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  Icon,
  ModalHeader,
  SearchInput,
  Stack,
  Switch,
  Text,
  usePersonalization
} from '@monolith/ui'

import { useUserPersonalization } from '@/core/providers/features/UserPersonalizationProvider'
import type { WidgetEntry } from '@/system/dashboard/providers/WidgetProvider'
import {
  addDashboardWidget,
  readDashboardLayout
} from '@/system/dashboard/utils/layout'

function WidgetRow({ id, entry }: { id: string; entry: WidgetEntry }) {
  const { t } = useTranslation('apps.' + entry.moduleName)
  const ui = usePersonalization(),
    save = useUserPersonalization(),
    layout = readDashboardLayout(ui.dashboardLayout)
  const enabled = Object.values(layout).some(tiles =>
    tiles.some(tile => tile.i === id)
  )
  const title = t(['widgets.' + id + '.title', 'widgets.' + id], {
    defaultValue: id,
    returnObjects: false
  })
  async function change(value: boolean) {
    await save.changeDashboardLayout(
      value
        ? addDashboardWidget(layout, id, entry)
        : Object.fromEntries(
            Object.entries(layout).map(([name, tiles]) => [
              name,
              tiles.filter(tile => tile.i !== id)
            ])
          )
    )
  }
  return (
    <Flex
      align="center"
      gap="md"
      p="md"
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--shape-lg)'
      }}
    >
      <Icon icon={entry.icon} color="muted" />
      <Stack flex="1" gap="xs">
        <Text weight="medium">{title}</Text>
        <Text color="muted" size="sm">
          {t('widgets.' + id + '.description', { defaultValue: '' })}
        </Text>
      </Stack>
      <Switch aria-label={title} value={enabled} onChange={change} />
    </Flex>
  )
}
export default function ManageWidgetsModal({
  data,
  onClose
}: {
  data: { widgets: Record<string, WidgetEntry> }
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const entries = Object.entries(data.widgets).filter(([id, item]) =>
    (id + ' ' + item.moduleName)
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )
  const groups = new Map<string, typeof entries>()
  for (const entry of entries) {
    const key = entry[1].moduleName
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  const { t } = useTranslation([...groups.keys()].map(name => 'apps.' + name))
  return (
    <Stack width="560px" maxWidth="100%" gap="md">
      <ModalHeader
        namespace="common.dashboard"
        title="modals.manageWidgets"
        icon="tabler:layout-grid"
        onClose={onClose}
      />
      <SearchInput
        namespace={false}
        searchTarget="widgets"
        value={search}
        onChange={setSearch}
      />
      <Stack gap="lg" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        {[...groups].map(([name, rows]) => (
          <Stack key={name} gap="sm">
            <Text color="muted" weight="semibold">
              {t('apps.' + name + ':title', { defaultValue: name })}
            </Text>
            {rows.map(([id, entry]) => (
              <WidgetRow key={id} id={id} entry={entry} />
            ))}
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}
