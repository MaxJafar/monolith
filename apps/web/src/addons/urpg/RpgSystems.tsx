import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  FloatingPopover,
  Grid,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { type CSSProperties, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type RPGCommand,
  type StatCode,
  coins,
  earnedXP,
  levelProgress,
  periodStart,
  stats
} from '../../../../../modules/monolith--databases/urpgShared'
import { Meter } from './Character'
import { Field } from './UrpgWizard'
import type { useRpg } from './useRpg'

type Props = { rpg: ReturnType<typeof useRpg>; stat?: StatCode }
export function Skills({ rpg, stat }: Props) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    state = rpg.state!
  const [name, setName] = useState(''),
    [chosen, setChosen] = useState<StatCode>(stat ?? 'CRFT')
  return (
    <Stack gap="lg">
      <Text as="h2" size="lg" weight="semibold">
        {t('skills')}
      </Text>
      <Grid templateCols={{ base: 1, md: 2 }} gap="lg">
        {state.skills
          .filter(s => !stat || s.stat === stat)
          .map(skill => {
            const xp = state.ledger
                .filter(e => !e.voided && e.skillId === skill.id)
                .reduce((sum, e) => sum + e.xp, 0),
              level = levelProgress(xp)
            return (
              <Stack
                key={skill.id}
                gap="sm"
                className={stat ? 'urpg-skill' : undefined}
                data-trained={xp > 0}
                p={stat ? 'md' : 'none'}
                r="sm"
                style={
                  { '--rpg-color': stats[skill.stat].color } as CSSProperties
                }
              >
                <Flex justify="between" gap="sm">
                  <Text size="sm" weight="medium">
                    {skill.name}
                  </Text>
                  <Text size="xs" color="muted">
                    {t('level', { level: level.level })}
                  </Text>
                </Flex>
                <Meter
                  label={t(`stats.${skill.stat}`)}
                  value={level.current}
                  target={level.required}
                  color={stats[skill.stat].color}
                  unit="XP"
                />
              </Stack>
            )
          })}
      </Grid>
      <Flex
        as="form"
        gap="sm"
        wrap="wrap"
        onSubmit={async e => {
          e.preventDefault()
          if (
            await rpg.execute({
              type: 'skill',
              id: crypto.randomUUID(),
              name,
              stat: stat ?? chosen
            })
          )
            setName('')
        }}
      >
        <Box
          as="input"
          className="workspace-input"
          required
          maxLength={200}
          aria-label={t('skillName')}
          placeholder={t('skillName')}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {!stat && (
          <ChoiceSelect
            label={t('stat')}
            value={chosen}
            options={Object.keys(stats).map(value => ({
              value,
              label: t(`stats.${value}`)
            }))}
            onChange={v => setChosen(v as StatCode)}
          />
        )}
        <Button
          namespace={false}
          type="submit"
          disabled={rpg.readOnly || rpg.busy}
          icon="lucide:plus"
        >
          {t('addSkill')}
        </Button>
      </Flex>
    </Stack>
  )
}

export function Reflection({ rpg }: Props) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    state = rpg.state!
  const [period, setPeriod] = useState<
      'day' | 'week' | 'month' | 'season' | 'year'
    >('week'),
    [day, setDay] = useState(rpg.day)
  const start = periodStart(day, period),
    entries = state.ledger.filter(
      e => !e.voided && e.day >= start && e.day <= day
    ),
    encounters = state.encounters.filter(e => e.day >= start && e.day <= day)
  return (
    <Stack gap="lg">
      <Flex align="center" justify="between" gap="sm" wrap="wrap">
        <Text as="h2" size="lg" weight="semibold">
          {t('reflection')}
        </Text>
        <Flex gap="sm">
          <ChoiceSelect
            label={t('period')}
            value={period}
            options={['day', 'week', 'month', 'season', 'year'].map(value => ({
              value,
              label: t(`periods.${value}`)
            }))}
            onChange={v => setPeriod(v as typeof period)}
          />
          <Box
            as="input"
            type="date"
            className="workspace-input"
            aria-label={t('throughDate')}
            width="160px"
            minWidth="140px"
            value={day}
            onChange={e => {
              if (e.target.value) setDay(e.target.value)
            }}
          />
        </Flex>
      </Flex>
      <Text size="xs" color="muted">
        {start} — {day}
      </Text>
      <Grid templateCols={{ base: 2, md: 4 }} gap="md">
        {[
          [t('earned'), `${earnedXP(state, start, day)} XP`],
          [t('completed'), entries.length],
          [
            t('focusTime'),
            `${encounters.filter(e => e.kind === 'focus').reduce((s, e) => s + e.minutes, 0)} min`
          ],
          [
            t('recoveryTime'),
            `${encounters.filter(e => e.kind === 'recovery').reduce((s, e) => s + e.minutes, 0)} min`
          ]
        ].map(([label, value]) => (
          <Stack key={label} className="urpg-panel" r="sm" p="md" gap="xs">
            <Text size="2xl" weight="semibold">
              {value}
            </Text>
            <Text size="xs" color="muted">
              {label}
            </Text>
          </Stack>
        ))}
      </Grid>
      <Stack gap="md">
        {Object.entries(stats).map(([code, meta]) => (
          <Meter
            key={code}
            label={t(`stats.${code}`)}
            value={entries
              .filter(e => e.stat === code)
              .reduce((sum, e) => sum + e.xp, 0)}
            target={Math.max(
              1,
              ...Object.keys(stats).map(s =>
                entries
                  .filter(e => e.stat === s)
                  .reduce((sum, e) => sum + e.xp, 0)
              )
            )}
            color={meta.color}
            unit="XP"
          />
        ))}
      </Stack>
      <Text size="sm" color="muted">
        {t('distractionMinutes', {
          minutes: encounters
            .filter(e => e.kind === 'distraction')
            .reduce((s, e) => s + e.minutes, 0)
        })}
      </Text>
      <Text weight="medium">{t('completionHistory')}</Text>
      {entries
        .slice()
        .reverse()
        .map(entry => (
          <Flex
            key={entry.id}
            justify="between"
            align="center"
            gap="sm"
            className="urpg-row"
            py="sm"
          >
            <Stack gap="xs">
              <Text size="sm">{entry.title}</Text>
              <Text size="xs" color="muted">
                {entry.day} · {t(`qualities.${entry.quality}`)}
              </Text>
            </Stack>
            <Text size="sm">+{entry.xp} XP</Text>
            <Button
              namespace={false}
              variant="plain"
              disabled={rpg.busy || rpg.readOnly}
              icon="lucide:undo-2"
              aria-label={t('undo')}
              onClick={() => void rpg.execute({ type: 'undo', id: entry.id })}
            />
          </Flex>
        ))}
    </Stack>
  )
}

export function Systems({
  rpg,
  view
}: Props & { view: 'rewards' | 'recovery' | 'encounters' }) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    state = rpg.state!
  const [anchor, setAnchor] = useState<HTMLElement | null>(null),
    [title, setTitle] = useState(''),
    [amount, setAmount] = useState(30),
    [stat, setStat] = useState<StatCode>('MIND'),
    [recovery, setRecovery] = useState(''),
    [date, setDate] = useState(rpg.day),
    [kind, setKind] = useState('focus'),
    [itemId, setItemId] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  async function submit() {
    const command: RPGCommand =
      view === 'rewards'
        ? { type: 'reward', id: requestId, title, cost: amount }
        : view === 'recovery'
          ? {
              type: 'debuff',
              id: requestId,
              value: { title, stat, reduction: amount / 100, recovery }
            }
          : {
              type: 'encounter',
              id: requestId,
              value: {
                title,
                day: date,
                minutes: amount,
                kind: kind as 'focus' | 'recovery' | 'distraction',
                itemId: itemId || null
              }
            }
    if (await rpg.execute(command)) {
      setAnchor(null)
      setTitle('')
      setRecovery('')
      setRequestId(crypto.randomUUID())
    }
  }
  return (
    <Stack gap="md">
      <Flex align="center" justify="between">
        <Stack gap="xs">
          <Text as="h2" size="lg" weight="semibold">
            {t(view)}
          </Text>
          <Text size="sm" color="muted">
            {view === 'rewards'
              ? t('coinBalance', { count: coins(state, rpg.day) })
              : t(`${view}Help`)}
          </Text>
        </Stack>
        <Button
          namespace={false}
          icon="lucide:plus"
          disabled={rpg.readOnly}
          onClick={e => {
            setAmount(view === 'recovery' ? 15 : view === 'rewards' ? 100 : 30)
            setAnchor(e.currentTarget)
          }}
        >
          {t('add')}
        </Button>
      </Flex>
      {view === 'rewards' && (
        <>
          <Text size="xs" color="muted">
            {t('coinsHelp')}
          </Text>
          {state.rewards.map(reward => (
            <Flex
              key={reward.id}
              className="urpg-row"
              align="center"
              justify="between"
              gap="md"
              py="md"
            >
              <Flex gap="sm" align="center">
                <Icon icon="lucide:gift" />
                <Text size="sm">{reward.title}</Text>
              </Flex>
              <Button
                namespace={false}
                variant="secondary"
                disabled={
                  rpg.readOnly ||
                  rpg.busy ||
                  coins(state, rpg.day) < reward.cost
                }
                onClick={() =>
                  void rpg.execute({
                    type: 'redeem',
                    id: crypto.randomUUID(),
                    rewardId: reward.id
                  })
                }
              >
                {t('buyCoins', { count: reward.cost })}
              </Button>
            </Flex>
          ))}
          {state.redemptions
            .filter(r => !r.voided)
            .slice()
            .reverse()
            .map(r => (
              <Flex key={r.id} gap="sm" align="center" justify="between">
                <Stack gap="xs">
                  <Text size="sm">{r.title}</Text>
                  <Text size="xs" color="muted">
                    {r.day} · −{r.cost} {t('coins')}
                  </Text>
                </Stack>
                <Button
                  namespace={false}
                  variant="plain"
                  disabled={rpg.busy || rpg.readOnly}
                  onClick={() => void rpg.execute({ type: 'refund', id: r.id })}
                >
                  {t('refund')}
                </Button>
              </Flex>
            ))}
        </>
      )}
      {view === 'recovery' && (
        <>
          {state.debuffs
            .filter(d => !d.recoveredAt)
            .map(d => (
              <Stack key={d.id} className="urpg-panel" p="md" gap="sm" r="sm">
                <Flex justify="between" gap="sm">
                  <Text weight="medium">{d.title}</Text>
                  <Text size="xs" color="muted">
                    {t(`stats.${d.stat}`)} · −{Math.round(d.reduction * 100)}%
                    XP
                  </Text>
                </Flex>
                <Text size="sm" color="muted">
                  {t('recoveryPath')}: {d.recovery}
                </Text>
                <Button
                  namespace={false}
                  variant="secondary"
                  width="fit-content"
                  disabled={rpg.busy || rpg.readOnly}
                  onClick={() =>
                    void rpg.execute({ type: 'recover', id: d.id })
                  }
                >
                  {t('recovered')}
                </Button>
              </Stack>
            ))}
          <Text size="xs" color="muted">
            {t('debuffHelp')}
          </Text>
        </>
      )}
      {view === 'encounters' && (
        <>
          {state.encounters
            .slice()
            .sort((a, b) => b.day.localeCompare(a.day))
            .map(e => (
              <Flex
                key={e.id}
                className="urpg-row"
                justify="between"
                align="center"
                gap="sm"
                py="sm"
              >
                <Stack gap="xs">
                  <Text size="sm" weight="medium">
                    {e.title}
                  </Text>
                  <Text color="muted" size="xs">
                    {e.day} · {t(`encounterKinds.${e.kind}`)} · {e.minutes} min
                    {e.itemId
                      ? ` · ${state.items.find(i => i.id === e.itemId)?.title ?? ''}`
                      : ''}
                  </Text>
                </Stack>
                <Button
                  namespace={false}
                  variant="plain"
                  disabled={rpg.readOnly || rpg.busy}
                  icon="lucide:x"
                  aria-label={t('remove')}
                  onClick={() =>
                    void rpg.execute({ type: 'removeEncounter', id: e.id })
                  }
                />
              </Flex>
            ))}
        </>
      )}
      {(view === 'rewards'
        ? !state.rewards.length
        : view === 'recovery'
          ? !state.debuffs.some(d => !d.recoveredAt)
          : !state.encounters.length) && (
        <Text color="muted" size="sm" py="xl" align="center">
          {t(`${view}Empty`)}
        </Text>
      )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={t(`add${view}`)}
          width={360}
          className="urpg-popover"
          onClose={() => setAnchor(null)}
        >
          <Stack
            as="form"
            gap="md"
            onSubmit={e => {
              e.preventDefault()
              void submit()
            }}
          >
            <Text weight="semibold" size="sm">
              {t(`add${view}`)}
            </Text>
            <Field label={t('title')}>
              <Box
                as="input"
                className="workspace-input"
                required
                maxLength={200}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </Field>
            <Field
              label={t(
                view === 'rewards'
                  ? 'cost'
                  : view === 'recovery'
                    ? 'reduction'
                    : 'minutes'
              )}
            >
              <Box
                as="input"
                type="number"
                className="workspace-input"
                min={view === 'recovery' ? 0 : 1}
                max={
                  view === 'recovery' ? 50 : view === 'rewards' ? 100000 : 1440
                }
                value={amount}
                required
                onChange={e => setAmount(Number(e.target.value))}
              />
            </Field>
            {view === 'recovery' && (
              <>
                <ChoiceSelect
                  label={t('stat')}
                  value={stat}
                  options={Object.keys(stats).map(value => ({
                    value,
                    label: t(`stats.${value}`)
                  }))}
                  onChange={v => setStat(v as StatCode)}
                />
                <Field label={t('recoveryPath')}>
                  <Box
                    as="input"
                    className="workspace-input"
                    required
                    maxLength={200}
                    value={recovery}
                    onChange={e => setRecovery(e.target.value)}
                  />
                </Field>
              </>
            )}
            {view === 'encounters' && (
              <>
                <Field label={t('date')}>
                  <Box
                    as="input"
                    className="workspace-input"
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </Field>
                <ChoiceSelect
                  label={t('type')}
                  value={kind}
                  options={['focus', 'recovery', 'distraction'].map(value => ({
                    value,
                    label: t(`encounterKinds.${value}`)
                  }))}
                  onChange={setKind}
                />
                <ChoiceSelect
                  label={t('linkedItem')}
                  value={itemId}
                  options={[
                    { value: '', label: t('noParent') },
                    ...state.items
                      .filter(i => !i.archived)
                      .map(i => ({ value: i.id, label: i.title }))
                  ]}
                  onChange={setItemId}
                />
              </>
            )}
            {rpg.error && (
              <Text role="alert" color="dangerous" size="sm">
                {rpg.error}
              </Text>
            )}
            <Button namespace={false} type="submit" disabled={rpg.busy}>
              {t('save')}
            </Button>
          </Stack>
        </FloatingPopover>
      )}
    </Stack>
  )
}
