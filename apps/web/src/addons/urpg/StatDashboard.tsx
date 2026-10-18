import { Button, Flex, Grid, Icon, Stack, Text } from '@monolith/ui'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type StatCode,
  completion,
  levelProgress,
  stats,
  weekKey
} from '../../../../../modules/monolith--databases/urpgShared'
import { Meter } from './Character'
import RpgItems from './RpgItems'
import { Skills } from './RpgSystems'
import type { useRpg } from './useRpg'

type Props = { rpg: ReturnType<typeof useRpg>; stat: StatCode }

export function StatHeader({
  rpg,
  stat,
  onBack
}: Props & { onBack: () => void }) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' })
  const meta = stats[stat]
  const xp = rpg
    .state!.ledger.filter(entry => !entry.voided && entry.stat === stat)
    .reduce((sum, entry) => sum + entry.xp, 0)
  const level = levelProgress(xp)
  return (
    <Stack
      as="header"
      className="urpg-stat-hero"
      gap="md"
      p={{ base: 'md', md: 'lg' }}
      r="sm"
      style={{ '--rpg-color': meta.color } as CSSProperties}
    >
      <Flex justify="between" align="center" gap="sm" wrap="wrap">
        <Text
          size="xs"
          weight="medium"
          color="muted"
          tracking="wide"
          transform="uppercase"
        >
          {t(`domains.${stat}.name`)} · {stat}
        </Text>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:arrow-left"
          p="xs"
          onClick={onBack}
        >
          {t('clearStat')}
        </Button>
      </Flex>
      <Grid
        templateCols={{ base: 1, sm: 'minmax(0, 1fr) auto' }}
        align="center"
        gap="md"
      >
        <Flex align="center" gap="md" flex="1" minWidth="0">
          <Flex
            className="urpg-stat-emblem"
            align="center"
            justify="center"
            width="64px"
            height="72px"
            flexShrink="0"
            aria-hidden="true"
          >
            <Icon
              preserveStyle
              icon={meta.icon}
              size="30px"
              style={{ color: meta.color }}
            />
          </Flex>
          <Stack gap="xs" minWidth="0">
            <Text as="h1" size="3xl" weight="semibold">
              {t(`stats.${stat}`)}
            </Text>
            <Text size="sm" color="muted">
              {t(`domains.${stat}.description`)}
            </Text>
          </Stack>
        </Flex>
        <Stack gap="xs" className="urpg-stat-level" width="fit-content">
          <Text size="xl" weight="semibold">
            {t('level', { level: level.level })}
          </Text>
          <Text size="xs" color="muted">
            {xp.toLocaleString()} XP · {t('totalEarned')}
          </Text>
        </Stack>
      </Grid>
      <Stack gap="sm">
        <Meter
          label={t('statExperience', { stat: t(`stats.${stat}`) })}
          value={level.current}
          target={level.required}
          color={meta.color}
          unit="XP"
        />
        <Text size="xs" color="muted">
          {t('nextLevel', {
            xp: (level.required - level.current).toLocaleString(),
            level: level.level + 1
          })}
        </Text>
      </Stack>
    </Stack>
  )
}

export default function StatDashboard({ rpg, stat }: Props) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'urpg' })
  const state = rpg.state!
  const entries = state.ledger.filter(
    entry => !entry.voided && entry.stat === stat
  )
  const thisWeek = entries.filter(
    entry => entry.day >= weekKey(rpg.day) && entry.day <= rpg.day
  )
  const activeItems = state.items.filter(
    item =>
      item.stat === stat && !item.archived && !completion(state, item, rpg.day)
  )
  const skills = state.skills.filter(skill => skill.stat === stat)
  const trained = new Set(
    entries.filter(entry => entry.skillId).map(entry => entry.skillId)
  )
  const recent = [...entries]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4)
  const debuffs = state.debuffs.filter(
    debuff => debuff.stat === stat && !debuff.recoveredAt
  )
  const date = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
  return (
    <Stack
      gap="xl"
      className="urpg-stat-dashboard"
      style={{ '--rpg-color': stats[stat].color } as CSSProperties}
    >
      <Grid
        as="dl"
        templateCols={{ base: 2, md: 4 }}
        gap="md"
        className="urpg-stat-summary"
        m="none"
        pb="lg"
      >
        {[
          [
            t('thisWeek'),
            `+${thisWeek.reduce((sum, entry) => sum + entry.xp, 0).toLocaleString()} XP`
          ],
          [t('completed'), entries.length.toLocaleString()],
          [t('activeSteps'), activeItems.length.toLocaleString()],
          [
            t('skillsPracticed'),
            `${skills.filter(skill => trained.has(skill.id)).length} / ${skills.length}`
          ]
        ].map(([label, value]) => (
          <Stack key={label} gap="xs">
            <Text as="dt" size="xs" color="muted">
              {label}
            </Text>
            <Text
              as="dd"
              m="none"
              size="lg"
              weight="medium"
              className="urpg-stat-number"
            >
              {value}
            </Text>
          </Stack>
        ))}
      </Grid>
      <Grid templateCols={{ base: 1, lg: 'minmax(0, 1fr) 240px' }} gap="xl">
        <Stack gap="xl" minWidth="0">
          <RpgItems key={stat} rpg={rpg} view="overview" stat={stat} />
          <Skills key={stat} rpg={rpg} stat={stat} />
        </Stack>
        <Stack
          as="aside"
          aria-label={t('recentGains')}
          gap="lg"
          minWidth="0"
          className="urpg-stat-journal"
        >
          <Stack gap="md">
            <Flex align="center" gap="sm">
              <Icon icon="lucide:sparkles" size="16px" />
              <Text as="h2" size="sm" weight="semibold">
                {t('recentGains')}
              </Text>
            </Flex>
            {recent.length ? (
              recent.map(entry => (
                <Stack
                  key={entry.id}
                  className="urpg-gain"
                  gap="xs"
                  pl="md"
                  py="xs"
                >
                  <Text size="sm" weight="medium" overflowWrap="anywhere">
                    {entry.title}
                  </Text>
                  <Flex align="center" justify="between" gap="sm">
                    <Text size="xs" color="muted">
                      {date.format(new Date(`${entry.day}T12:00:00Z`))} ·{' '}
                      {t(`kinds.${entry.kind}`)}
                    </Text>
                    <Text
                      size="xs"
                      weight="medium"
                      whiteSpace="nowrap"
                      className="urpg-gain-xp"
                    >
                      +{entry.xp.toLocaleString()} XP
                    </Text>
                  </Flex>
                </Stack>
              ))
            ) : (
              <Text size="sm" color="muted">
                {t('firstGainHelp')}
              </Text>
            )}
          </Stack>
          {debuffs.length > 0 && (
            <Stack gap="sm" className="urpg-recovery-note" p="md" r="sm">
              <Flex align="center" gap="sm">
                <Icon icon="lucide:heart-handshake" size="16px" />
                <Text size="sm" weight="medium">
                  {t('recovery')}
                </Text>
              </Flex>
              {debuffs.map(debuff => (
                <Stack key={debuff.id} gap="xs">
                  <Text size="xs" weight="medium">
                    {debuff.title} · −{Math.round(debuff.reduction * 100)}% XP
                  </Text>
                  <Text size="xs" color="muted">
                    {debuff.recovery}
                  </Text>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Grid>
    </Stack>
  )
}
