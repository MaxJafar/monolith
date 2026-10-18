import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  FloatingPopover,
  Grid,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type Campaign,
  type RPGCommand,
  type RPGItem,
  type StatCode,
  baseXP,
  difficulty,
  itemKinds,
  previewXP,
  stats
} from '../../../../../modules/monolith--databases/urpgShared'
import { Field } from './UrpgWizard'

export function ItemEditor({
  anchor,
  state,
  item,
  stat = 'CRFT',
  defaultKind = 'action',
  busy,
  error,
  execute,
  onClose
}: {
  anchor: HTMLElement
  state: Campaign
  item?: RPGItem
  stat?: StatCode
  defaultKind?: RPGItem['kind']
  busy: boolean
  error: string
  execute: (command: RPGCommand) => Promise<boolean>
  onClose: () => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' })
  const [id] = useState(item?.id ?? crypto.randomUUID())
  const [value, setValue] = useState({
    title: item?.title ?? '',
    kind: item?.kind ?? defaultKind,
    stat: item?.stat ?? stat,
    skillId: item?.skillId ?? null,
    parentId: item?.parentId ?? null,
    difficulty: item?.difficulty ?? 'easy',
    baseXP: item?.baseXP ?? baseXP[defaultKind],
    due: item?.due ?? null,
    notes: item?.notes ?? ''
  })
  const parentKind = {
    mission: 'epic',
    quest: 'mission',
    challenge: 'quest',
    action: 'challenge'
  }[value.kind as 'mission' | 'quest' | 'challenge' | 'action']
  return (
    <FloatingPopover
      anchor={anchor}
      label={t(item ? 'editItem' : 'newItem')}
      width={420}
      className="urpg-popover"
      onClose={onClose}
    >
      <Stack
        as="form"
        gap="md"
        onSubmit={async event => {
          event.preventDefault()
          if (await execute({ type: 'item', id, value })) onClose()
        }}
      >
        <Flex justify="between" align="center">
          <Text weight="semibold" size="sm">
            {t(item ? 'editItem' : 'newItem')}
          </Text>
          <Button
            namespace={false}
            variant="plain"
            icon="lucide:x"
            aria-label={t('close')}
            onClick={onClose}
          />
        </Flex>
        <Field label={t('title')}>
          <Box
            as="input"
            className="workspace-input"
            autoFocus
            required
            maxLength={200}
            value={value.title}
            onChange={e => setValue({ ...value, title: e.target.value })}
          />
        </Field>
        <Grid templateCols={2} gap="sm">
          <Field label={t('type')}>
            <ChoiceSelect
              label={t('type')}
              value={value.kind}
              disabled={!!item && state.ledger.some(e => e.itemId === item.id)}
              options={itemKinds.map(value => ({
                value,
                label: t(`kinds.${value}`)
              }))}
              onChange={kind =>
                setValue({
                  ...value,
                  kind: kind as RPGItem['kind'],
                  baseXP: baseXP[kind as RPGItem['kind']],
                  parentId: null
                })
              }
            />
          </Field>
          <Field label={t('stat')}>
            <ChoiceSelect
              label={t('stat')}
              value={value.stat}
              options={Object.keys(stats).map(value => ({
                value,
                label: t(`stats.${value}`)
              }))}
              onChange={stat =>
                setValue({ ...value, stat: stat as StatCode, skillId: null })
              }
            />
          </Field>
        </Grid>
        <Field label={t('skill')}>
          <ChoiceSelect
            label={t('skill')}
            value={value.skillId ?? ''}
            options={[
              { value: '', label: t('noSkill') },
              ...state.skills
                .filter(s => s.stat === value.stat)
                .map(s => ({ value: s.id, label: s.name }))
            ]}
            onChange={skillId =>
              setValue({ ...value, skillId: skillId || null })
            }
          />
        </Field>
        {parentKind && (
          <Field label={t('parent')}>
            <ChoiceSelect
              label={t('parent')}
              value={value.parentId ?? ''}
              options={[
                { value: '', label: t('noParent') },
                ...state.items
                  .filter(
                    i => i.kind === parentKind && !i.archived && i.id !== id
                  )
                  .map(i => ({ value: i.id, label: i.title }))
              ]}
              onChange={parentId =>
                setValue({ ...value, parentId: parentId || null })
              }
            />
          </Field>
        )}
        <Grid templateCols={2} gap="sm">
          <Field label={t('difficulty')}>
            <ChoiceSelect
              label={t('difficulty')}
              value={value.difficulty}
              options={Object.entries(difficulty).map(
                ([value, multiplier]) => ({
                  value,
                  label: `${t(`difficulties.${value}`)} · ${multiplier}×`
                })
              )}
              onChange={difficulty =>
                setValue({
                  ...value,
                  difficulty: difficulty as RPGItem['difficulty']
                })
              }
            />
          </Field>
          <Field label={t('baseXP')}>
            <Box
              as="input"
              className="workspace-input"
              type="number"
              min="1"
              max="10000"
              required
              value={value.baseXP}
              onChange={e =>
                setValue({ ...value, baseXP: Number(e.target.value) })
              }
            />
          </Field>
        </Grid>
        <Field label={t('due')}>
          <Box
            as="input"
            className="workspace-input"
            type="date"
            value={value.due ?? ''}
            onChange={e => setValue({ ...value, due: e.target.value || null })}
          />
        </Field>
        <Field label={t('notes')}>
          <Box
            as="textarea"
            className="workspace-input"
            height="74px"
            value={value.notes}
            maxLength={10000}
            onChange={e => setValue({ ...value, notes: e.target.value })}
          />
        </Field>
        <Text size="xs" color="muted">
          {t('previewXP', { xp: previewXP(state, value, 'done') })}
        </Text>
        {error && (
          <Text role="alert" size="sm" color="dangerous">
            {error}
          </Text>
        )}
        <Flex justify="between">
          <Button namespace={false} variant="plain" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button namespace={false} type="submit" loading={busy}>
            {t('save')}
          </Button>
        </Flex>
      </Stack>
    </FloatingPopover>
  )
}
