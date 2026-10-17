import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  FloatingPopover,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type RPGItem,
  type StatCode,
  completion,
  previewXP,
  quality,
  stats
} from '../../../../../modules/monolith--databases/urpgShared'
import { ItemEditor } from './ItemEditor'
import type { useRpg } from './useRpg'

export default function RpgItems({
  rpg,
  view,
  stat
}: {
  rpg: ReturnType<typeof useRpg>
  view: string
  stat?: StatCode
}) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    state = rpg.state!
  const [editor, setEditor] = useState<{
      anchor: HTMLElement
      item?: RPGItem
    }>(),
    [finish, setFinish] = useState<{ anchor: HTMLElement; item: RPGItem }>()
  const [result, setResult] = useState<keyof typeof quality>('done'),
    [status, setStatus] = useState('open'),
    [search, setSearch] = useState(''),
    [kind, setKind] = useState('all')
  const items = state.items.filter(
    i =>
      (!stat || i.stat === stat) &&
      (view !== 'rituals' || ['daily', 'weekly', 'workout'].includes(i.kind)) &&
      (view !== 'quests' ||
        ['epic', 'mission', 'quest', 'challenge', 'action'].includes(i.kind)) &&
      (kind === 'all' || i.kind === kind) &&
      i.title.toLowerCase().includes(search.toLowerCase()) &&
      (status === 'archived'
        ? i.archived
        : !i.archived &&
          (status === 'all' ||
            (status === 'done') === !!completion(state, i, rpg.day)))
  )
  return (
    <Stack gap="md">
      <Flex align="center" justify="between" gap="sm" wrap="wrap">
        <Text as="h2" size="lg" weight="semibold">
          {t(view === 'rituals' ? 'rituals' : 'questLog')}
        </Text>
        <Button
          namespace={false}
          disabled={rpg.readOnly}
          icon="lucide:plus"
          onClick={e => setEditor({ anchor: e.currentTarget })}
        >
          {t('newItem')}
        </Button>
      </Flex>
      <Flex gap="sm" wrap="wrap">
        <Box
          as="input"
          className="workspace-input"
          flex="1"
          minWidth="140px"
          aria-label={t('searchItems')}
          placeholder={t('searchItems')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Box width="125px" flexShrink="0">
          <ChoiceSelect
            label={t('status')}
            value={status}
            options={['open', 'done', 'all', 'archived'].map(value => ({
              value,
              label: t(value)
            }))}
            onChange={setStatus}
          />
        </Box>
        <Box width="145px" flexShrink="0">
          <ChoiceSelect
            label={t('type')}
            value={kind}
            options={[
              'all',
              ...(view === 'rituals'
                ? ['daily', 'weekly', 'workout']
                : [
                    'epic',
                    'mission',
                    'quest',
                    'challenge',
                    'action',
                    'daily',
                    'weekly',
                    'workout'
                  ])
            ].map(value => ({
              value,
              label: value === 'all' ? t('allTypes') : t(`kinds.${value}`)
            }))}
            onChange={setKind}
          />
        </Box>
      </Flex>
      <Stack gap="none">
        {items.map(item => {
          const done = completion(state, item, rpg.day),
            parent = state.items.find(i => i.id === item.parentId)
          return (
            <Flex
              key={item.id}
              className="urpg-row"
              align="center"
              gap="sm"
              py="sm"
            >
              <Button
                namespace={false}
                className="urpg-check"
                variant="plain"
                aria-label={t(done ? 'undoItem' : 'completeItem', {
                  title: item.title
                })}
                aria-pressed={!!done}
                disabled={rpg.busy || rpg.readOnly || item.archived}
                icon={done ? 'lucide:check' : undefined}
                onClick={e => {
                  if (done) void rpg.execute({ type: 'undo', id: done.id })
                  else {
                    setResult('done')
                    setFinish({ anchor: e.currentTarget, item })
                  }
                }}
              />
              <Icon
                preserveStyle
                icon={stats[item.stat].icon}
                style={{ color: stats[item.stat].color }}
                size="17px"
              />
              <Button
                namespace={false}
                variant="plain"
                justify="start"
                flex="1"
                minWidth="0"
                p="xs"
                disabled={rpg.readOnly}
                onClick={e => setEditor({ anchor: e.currentTarget, item })}
              >
                <Stack gap="xs" minWidth="0">
                  <Text
                    size="sm"
                    weight="medium"
                    decoration={done ? 'line-through' : 'none'}
                    truncate
                  >
                    {item.title}
                  </Text>
                  <Text color="muted" size="xs" truncate>
                    {t(`kinds.${item.kind}`)}
                    {parent ? ` · ${parent.title}` : ''}
                    {item.due ? ` · ${item.due}` : ''}
                  </Text>
                </Stack>
              </Button>
              <Text size="xs" color="muted" whiteSpace="nowrap">
                {done?.xp ?? previewXP(state, item, 'done')} XP
              </Text>
              <Button
                namespace={false}
                variant="plain"
                icon={
                  item.archived ? 'lucide:archive-restore' : 'lucide:archive'
                }
                aria-label={t(item.archived ? 'restore' : 'archive')}
                disabled={rpg.busy || rpg.readOnly}
                onClick={() =>
                  void rpg.execute({
                    type: 'archive',
                    id: item.id,
                    archived: !item.archived
                  })
                }
              />
            </Flex>
          )
        })}
      </Stack>
      {!items.length && (
        <Stack className="urpg-empty" align="center" p="xl" gap="sm" r="sm">
          <Icon icon="lucide:flag" color="muted" />
          <Text size="sm">{t('noItems')}</Text>
          <Text size="xs" color="muted">
            {t('noItemsHelp')}
          </Text>
        </Stack>
      )}
      {editor && (
        <ItemEditor
          {...editor}
          state={state}
          stat={stat}
          defaultKind={
            view === 'rituals'
              ? 'daily'
              : view === 'quests'
                ? 'quest'
                : 'action'
          }
          busy={rpg.busy}
          error={rpg.error}
          execute={rpg.execute}
          onClose={() => setEditor(undefined)}
        />
      )}
      {finish && (
        <FloatingPopover
          anchor={finish.anchor}
          label={t('complete')}
          width={330}
          onClose={() => setFinish(undefined)}
        >
          <Stack gap="md">
            <Text weight="semibold" size="sm">
              {finish.item.title}
            </Text>
            <ChoiceSelect
              label={t('quality')}
              value={result}
              options={Object.entries(quality).map(([value, multiplier]) => ({
                value,
                label: `${t(`qualities.${value}`)} · ${multiplier}×`
              }))}
              onChange={value => setResult(value as keyof typeof quality)}
            />
            <Text size="2xl" weight="semibold">
              +{previewXP(state, finish.item, result)} XP
            </Text>
            <Text size="xs" color="muted">
              {t('completionHelp')}
            </Text>
            <Button
              namespace={false}
              disabled={rpg.busy}
              onClick={async () => {
                if (
                  await rpg.execute({
                    type: 'complete',
                    id: finish.item.id,
                    quality: result
                  })
                )
                  setFinish(undefined)
              }}
            >
              {t('complete')}
            </Button>
            {rpg.error && (
              <Text role="alert" size="xs" color="dangerous">
                {rpg.error}
              </Text>
            )}
          </Stack>
        </FloatingPopover>
      )}
      {rpg.error && !editor && !finish && (
        <Text role="alert" size="sm" color="dangerous">
          {rpg.error}
        </Text>
      )}
    </Stack>
  )
}
