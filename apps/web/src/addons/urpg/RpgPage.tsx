import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Grid,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { type CSSProperties, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router'

import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'

import {
  type StatCode,
  earnedXP,
  levelProgress,
  stats,
  weekKey
} from '../../../../../modules/monolith--databases/urpgShared'
import UrpgAddonCard from './AddonCard'
import { Avatar, CharacterWidget, Meter } from './Character'
import RpgItems from './RpgItems'
import { Reflection, Skills, Systems } from './RpgSystems'
import StatDashboard, { StatHeader } from './StatDashboard'
import { Field, readAvatar } from './UrpgWizard'
import './urpg.css'
import { useRpg } from './useRpg'

export const rpgViews = {
  overview: 'lucide:layout-dashboard',
  quests: 'lucide:swords',
  rituals: 'lucide:repeat',
  skills: 'lucide:sprout',
  encounters: 'lucide:calendar-days',
  reflection: 'lucide:chart-no-axes-combined',
  rewards: 'lucide:gift',
  recovery: 'lucide:heart-handshake'
} as const

export default function RpgPage() {
  const { active } = useWorkspace()
  return <CampaignPage key={active?.id ?? 'none'} />
}

function CampaignPage() {
  const rpg = useRpg(),
    { state } = rpg,
    { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    [params, setParams] = useSearchParams()
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null)
  const rawView = params.get('view') ?? 'overview'
  const stat = params.get('stat') as StatCode | null,
    selectedStat = stat && stat in stats ? stat : undefined
  const view =
    rawView in rpgViews &&
    (!selectedStat ||
      ['overview', 'quests', 'rituals', 'skills'].includes(rawView))
      ? rawView
      : 'overview'
  function change(view: string, stat?: string) {
    const next = new URLSearchParams(params)
    next.set('view', view)
    if (stat) next.set('stat', stat)
    else next.delete('stat')
    setParams(next)
  }
  if (!rpg.enabled)
    return (
      <Stack p="xl" gap="md">
        <Text as="h1" size="3xl" weight="semibold">
          uRPG
        </Text>
        <UrpgAddonCard />
      </Stack>
    )
  if (rpg.query.isPending)
    return (
      <Text p="xl" role="status">
        {t('loading')}
      </Text>
    )
  if (!state || rpg.query.isError)
    return (
      <Stack p="xl" gap="md">
        <Text role="alert">{t('loadError')}</Text>
        <Button namespace={false} onClick={() => void rpg.query.refetch()}>
          {t('retry')}
        </Button>
      </Stack>
    )
  const level = levelProgress(earnedXP(state)),
    weekXP = earnedXP(state, weekKey(rpg.day), rpg.day)
  return (
    <Box className="urpg-page" flex="1" minHeight="0" overflowY="auto">
      <Stack
        maxWidth="1140px"
        style={{ marginInline: 'auto' }}
        px={{ base: 'md', md: 'xl' }}
        py="xl"
        gap="xl"
      >
        {selectedStat ? (
          <StatHeader
            rpg={rpg}
            stat={selectedStat}
            onBack={() => change('overview')}
          />
        ) : (
          <Flex align="center" justify="between" gap="lg" wrap="wrap">
            <Flex align="center" gap="lg">
              <Avatar state={state} large />
              <Stack gap="sm">
                <Text size="xs" color="muted">
                  uRPG · {t('campaign')}
                </Text>
                <Text as="h1" size="3xl" weight="semibold">
                  {state.character.name}
                </Text>
                <Flex gap="sm" align="center">
                  <Text weight="medium" size="sm">
                    {t('level', { level: level.level })}
                  </Text>
                  <Text size="sm" color="muted">
                    {earnedXP(state).toLocaleString()} XP
                  </Text>
                  <Button
                    namespace={false}
                    variant="plain"
                    icon="lucide:settings-2"
                    disabled={rpg.readOnly}
                    aria-label={t('editProfile')}
                    onClick={e => setProfileAnchor(e.currentTarget)}
                  />
                </Flex>
              </Stack>
            </Flex>
            <Stack width={{ base: '100%', md: '260px' }} gap="md">
              <Meter
                label={t('experience')}
                value={level.current}
                target={level.required}
                color="var(--selection-color)"
                unit="XP"
              />
              <Meter
                label={t('weeklyTarget')}
                value={weekXP}
                target={state.character.weeklyTarget}
                color="var(--selection-color)"
                unit="XP"
              />
            </Stack>
          </Flex>
        )}
        <Flex
          className="urpg-tabs"
          as="nav"
          aria-label={t('campaign')}
          gap="xs"
          wrap="wrap"
          pb="sm"
        >
          {Object.entries(rpgViews)
            .filter(
              ([key]) =>
                !selectedStat ||
                ['overview', 'quests', 'rituals', 'skills'].includes(key)
            )
            .map(([key, icon]) => (
              <Button
                key={key}
                namespace={false}
                variant="plain"
                icon={icon}
                aria-current={view === key ? 'page' : undefined}
                onClick={() => change(key, selectedStat)}
              >
                {t(key)}
              </Button>
            ))}
        </Flex>
        {view === 'overview' && selectedStat && (
          <StatDashboard key={selectedStat} rpg={rpg} stat={selectedStat} />
        )}
        {view === 'overview' && !selectedStat && (
          <>
            <Grid templateCols={{ base: 2, md: 4 }} gap="sm">
              {Object.entries(stats).map(([code, stat]) => {
                const xp = state.ledger
                    .filter(e => !e.voided && e.stat === code)
                    .reduce((sum, e) => sum + e.xp, 0),
                  progress = levelProgress(xp)
                return (
                  <Button
                    key={code}
                    namespace={false}
                    variant="plain"
                    className="urpg-stat"
                    style={{ '--rpg-color': stat.color } as CSSProperties}
                    p="md"
                    r="sm"
                    onClick={() => change('overview', code)}
                  >
                    <Stack gap="sm">
                      <Flex align="center" gap="sm">
                        <Icon
                          preserveStyle
                          icon={stat.icon}
                          style={{ color: stat.color }}
                        />
                        <Text size="sm" weight="medium">
                          {t(`stats.${code}`)}
                        </Text>
                      </Flex>
                      <Text size="xs" color="muted">
                        {code} · {t('level', { level: progress.level })}
                      </Text>
                      <Meter
                        label={`${xp.toLocaleString()} XP`}
                        value={progress.current}
                        target={progress.required}
                        color={stat.color}
                        unit="XP"
                      />
                    </Stack>
                  </Button>
                )
              })}
            </Grid>
            <Grid
              templateCols={{ base: 1, md: 'minmax(0, 1fr) 250px' }}
              gap="xl"
            >
              <RpgItems rpg={rpg} view="overview" stat={selectedStat} />
              <Stack
                gap="md"
                className="urpg-panel"
                p="md"
                r="sm"
                height="fit-content"
              >
                <Text size="sm" weight="semibold">
                  {t('todayVitals')}
                </Text>
                <CharacterWidget mode="vitals" />
                <Text size="xs" color="muted">
                  {t('vitalsHelp')}
                </Text>
              </Stack>
            </Grid>
          </>
        )}
        {(view === 'quests' || view === 'rituals') && (
          <RpgItems key={view} rpg={rpg} view={view} stat={selectedStat} />
        )}
        {view === 'skills' && (
          <Skills key={selectedStat ?? 'all'} rpg={rpg} stat={selectedStat} />
        )}
        {view === 'reflection' && <Reflection rpg={rpg} />}
        {(view === 'rewards' ||
          view === 'recovery' ||
          view === 'encounters') && (
          <Systems key={view} rpg={rpg} view={view} />
        )}
        {rpg.error && !['overview', 'quests', 'rituals'].includes(view) && (
          <Text role="alert" color="dangerous" size="sm">
            {rpg.error}
          </Text>
        )}
      </Stack>
      {profileAnchor && (
        <ProfileEditor
          anchor={profileAnchor}
          rpg={rpg}
          onClose={() => setProfileAnchor(null)}
        />
      )}
    </Box>
  )
}

function ProfileEditor({
  anchor,
  rpg,
  onClose
}: {
  anchor: HTMLElement
  rpg: ReturnType<typeof useRpg>
  onClose: () => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    [value, setValue] = useState(rpg.state!.character),
    [error, setError] = useState(''),
    [uploading, setUploading] = useState(false)
  return (
    <FloatingPopover
      anchor={anchor}
      label={t('editProfile')}
      width={360}
      className="urpg-popover"
      onClose={onClose}
    >
      <Stack
        as="form"
        gap="md"
        onSubmit={async e => {
          e.preventDefault()
          if (await rpg.execute({ type: 'profile', value })) onClose()
        }}
      >
        <Text weight="semibold" size="sm">
          {t('editProfile')}
        </Text>
        <Field label={t('characterName')}>
          <Box
            as="input"
            className="workspace-input"
            required
            value={value.name}
            maxLength={200}
            onChange={e => setValue({ ...value, name: e.target.value })}
          />
        </Field>
        <Field label={t('uploadAvatar')}>
          <Box
            as="input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              setError('')
              try {
                const avatar = await readAvatar(file)
                setValue(old => ({ ...old, avatar }))
              } catch (cause) {
                setError(String(cause))
              } finally {
                setUploading(false)
              }
            }}
          />
        </Field>
        {(
          [
            'age',
            'weight',
            'calorieTarget',
            'waterTarget',
            'weeklyTarget'
          ] as const
        ).map(key => (
          <Field key={key} label={t(key)}>
            <Box
              as="input"
              className="workspace-input"
              type="number"
              min="1"
              max={
                key === 'age'
                  ? 120
                  : key === 'weight'
                    ? 500
                    : key === 'weeklyTarget'
                      ? 1000000
                      : 20000
              }
              step={key === 'weight' ? 0.1 : 1}
              required={key !== 'age' && key !== 'weight'}
              value={value[key] ?? ''}
              onChange={e =>
                setValue({
                  ...value,
                  [key]: e.target.value
                    ? Number(e.target.value)
                    : key === 'age' || key === 'weight'
                      ? null
                      : 0
                })
              }
            />
          </Field>
        ))}
        <Text size="xs" color="muted">
          {t('targetsHelp')}
        </Text>
        {(error || rpg.error) && (
          <Text size="xs" role="alert" color="dangerous">
            {error || rpg.error}
          </Text>
        )}
        <Button
          namespace={false}
          type="submit"
          disabled={rpg.busy || uploading}
        >
          {t('save')}
        </Button>
      </Stack>
    </FloatingPopover>
  )
}

export function RpgNavigation() {
  const { t } = useTranslation('common', { keyPrefix: 'urpg' }),
    rpg = useRpg(),
    [params] = useSearchParams(),
    { pathname } = useLocation()
  const view = params.get('view') ?? 'overview',
    selected = params.get('stat')
  return (
    <Stack as="nav" aria-label="uRPG" gap="none" px="sm" py="sm">
      <Text size="xs" weight="semibold" color="muted" px="sm" pb="sm">
        uRPG
      </Text>
      {Object.entries(rpgViews).map(([key, icon]) => (
        <Button
          key={key}
          as={Link}
          namespace={false}
          variant="plain"
          className="monolith-system-link"
          justify="start"
          icon={icon}
          aria-current={
            pathname === '/urpg' && view === key && !selected
              ? 'page'
              : undefined
          }
          to={`/urpg?workspace=${rpg.workspaceId}&view=${key}`}
        >
          <Text size="sm">{t(key)}</Text>
        </Button>
      ))}
      <Button
        as={Link}
        namespace={false}
        variant="plain"
        justify="start"
        icon="lucide:book-open"
        aria-current={pathname === '/docs' ? 'page' : undefined}
        to={`/docs?workspace=${rpg.workspaceId}`}
      >
        {t('codex')}
      </Button>
      <Text size="xs" color="muted" px="sm" pt="md" pb="xs">
        {t('statsTitle')}
      </Text>
      {Object.entries(stats).map(([code, meta]) => (
        <Button
          key={code}
          as={Link}
          namespace={false}
          variant="plain"
          className="monolith-system-link"
          justify="start"
          icon={meta.icon}
          iconProps={{ preserveStyle: true, style: { color: meta.color } }}
          aria-current={
            pathname === '/urpg' && selected === code ? 'page' : undefined
          }
          to={`/urpg?workspace=${rpg.workspaceId}&view=overview&stat=${code}`}
        >
          <Text size="sm">{t(`stats.${code}`)}</Text>
        </Button>
      ))}
    </Stack>
  )
}
