import { Box, Button, Flex, Grid, Icon, Stack, Text } from '@monolith/ui'
import { type CSSProperties, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type Campaign,
  earnedXP,
  levelProgress
} from '../../../../../modules/monolith--databases/urpgShared'
import './urpg.css'
import { useRpg } from './useRpg'

export function Meter({
  label,
  value,
  target,
  color,
  unit
}: {
  label: string
  value: number
  target: number
  color: string
  unit: string
}) {
  return (
    <Stack gap="xs" style={{ '--rpg-color': color } as CSSProperties}>
      <Flex justify="between" gap="sm">
        <Text size="xs" weight="medium">
          {label}
        </Text>
        <Text size="xs" color="muted">
          {value.toLocaleString()} / {target.toLocaleString()} {unit}
        </Text>
      </Flex>
      <Box
        className="urpg-meter"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        aria-valuetext={`${value} / ${target} ${unit}`}
      >
        <Box
          className="urpg-meter-fill"
          width={`${Math.min(100, Math.max(0, (value / target) * 100))}%`}
        />
      </Box>
    </Stack>
  )
}
export function Avatar({
  state,
  large = false
}: {
  state: Campaign
  large?: boolean
}) {
  return (
    <Flex
      align="center"
      justify="center"
      className="urpg-avatar"
      width={large ? '96px' : '42px'}
      height={large ? '112px' : '48px'}
      flexShrink="0"
      r="sm"
      overflow="hidden"
    >
      {state.character.avatar ? (
        <Box
          as="img"
          src={state.character.avatar}
          alt={state.character.name}
          width="100%"
          height="100%"
          className="urpg-avatar-image"
        />
      ) : (
        <Icon icon="lucide:user-round" size={large ? '42px' : '24px'} />
      )}
    </Flex>
  )
}
export function CharacterWidget({
  mode = 'profile',
  readOnly = false
}: {
  mode?: 'profile' | 'vitals' | 'xp'
  readOnly?: boolean
}) {
  const rpg = useRpg(),
    { state, day } = rpg
  const { t } = useTranslation('common', { keyPrefix: 'urpg' })
  const [amount, setAmount] = useState(''),
    [kind, setKind] = useState<'calories' | 'water'>('water'),
    [logging, setLogging] = useState(false)
  if (!state)
    return (
      <Text color="muted" size="sm">
        {t(rpg.query.isError ? 'loadError' : 'createCharacter')}
      </Text>
    )
  const level = levelProgress(earnedXP(state))
  const total = (kind: 'calories' | 'water') =>
    state.vitals
      .filter(v => v.day === day && v.kind === kind)
      .reduce((sum, v) => sum + v.amount, 0)
  return (
    <Stack gap="md" className="urpg-character-widget">
      {mode === 'profile' && (
        <Flex gap="sm" align="center">
          <Avatar state={state} />
          <Stack gap="xs">
            <Text weight="semibold" size="sm">
              {state.character.name}
            </Text>
            <Text size="xs" color="muted">
              {t('level', { level: level.level })} ·{' '}
              {earnedXP(state).toLocaleString()} XP
            </Text>
          </Stack>
        </Flex>
      )}
      {mode !== 'vitals' && (
        <Meter
          label={t('experience')}
          value={level.current}
          target={level.required}
          color="var(--selection-color)"
          unit="XP"
        />
      )}
      {mode !== 'xp' && (
        <>
          <Meter
            label={t('health')}
            value={total('calories')}
            target={state.character.calorieTarget}
            color="#df6464"
            unit="kcal"
          />
          <Meter
            label={t('mana')}
            value={total('water')}
            target={state.character.waterTarget}
            color="#568fdf"
            unit="ml"
          />
        </>
      )}
      {mode !== 'xp' && !readOnly && !rpg.readOnly && (
        <>
          <Button
            namespace={false}
            variant="plain"
            justify="start"
            p="none"
            icon="lucide:plus"
            onClick={() => setLogging(!logging)}
          >
            {t('logVitals')}
          </Button>
          {logging && (
            <Stack
              as="form"
              gap="sm"
              onSubmit={async event => {
                event.preventDefault()
                if (
                  await rpg.execute({
                    type: 'vital',
                    id: crypto.randomUUID(),
                    kind,
                    amount: Number(amount)
                  })
                ) {
                  setAmount('')
                  setLogging(false)
                }
              }}
            >
              <Grid templateCols={2} gap="xs">
                {(['calories', 'water'] as const).map(value => (
                  <Button
                    key={value}
                    namespace={false}
                    variant="plain"
                    aria-pressed={kind === value}
                    onClick={() => setKind(value)}
                  >
                    {t(value)}
                  </Button>
                ))}
              </Grid>
              <Box
                as="input"
                className="workspace-input"
                aria-label={t(kind)}
                type="number"
                min="1"
                max="20000"
                step="1"
                required
                value={amount}
                placeholder={kind === 'water' ? 'ml' : 'kcal'}
                onChange={e => setAmount(e.target.value)}
              />
              <Button
                namespace={false}
                type="submit"
                disabled={rpg.busy || !Number(amount)}
              >
                {t('log')}
              </Button>
            </Stack>
          )}
          {state.vitals
            .filter(v => v.day === day)
            .slice(-2)
            .map(v => (
              <Flex key={v.id} align="center" justify="between">
                <Text size="xs" color="muted">
                  +{v.amount} {v.kind === 'water' ? 'ml' : 'kcal'}
                </Text>
                <Button
                  namespace={false}
                  variant="plain"
                  p="xs"
                  disabled={rpg.busy}
                  aria-label={t('undo')}
                  icon="lucide:undo-2"
                  onClick={() =>
                    void rpg.execute({ type: 'removeVital', id: v.id })
                  }
                />
              </Flex>
            ))}
        </>
      )}
      {rpg.error && (
        <Text size="xs" color="dangerous" role="alert">
          {rpg.error}
        </Text>
      )}
    </Stack>
  )
}
