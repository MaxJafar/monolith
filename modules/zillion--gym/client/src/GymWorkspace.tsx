import { Suspense, lazy } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Icon,
  ModuleHeader,
  Stack,
  Text
} from '@lifeforge/ui'

import { useGym } from './GymContext'
import { gymSectionParams } from './utils/navigation'
import DashboardView from './views/DashboardView'

const sectionLoaders = {
  plan: () => import('./views/PlanView'),
  workout: () => import('./views/WorkoutView'),
  library: () => import('./views/LibraryView'),
  history: () => import('./views/HistoryView'),
  stats: () => import('./views/StatsView'),
  settings: () => import('./views/SettingsView'),
  coach: () => import('./views/CoachView')
}
const views = {
  dashboard: DashboardView,
  plan: lazy(sectionLoaders.plan),
  workout: lazy(sectionLoaders.workout),
  library: lazy(sectionLoaders.library),
  history: lazy(sectionLoaders.history),
  stats: lazy(sectionLoaders.stats),
  settings: lazy(sectionLoaders.settings),
  coach: lazy(sectionLoaders.coach)
}

const sections = [
  ['dashboard', 'tabler:home'],
  ['plan', 'tabler:calendar-week'],
  ['workout', 'tabler:barbell'],
  ['library', 'tabler:books'],
  ['history', 'tabler:history'],
  ['stats', 'tabler:chart-bar'],
  ['settings', 'tabler:settings'],
  ['coach', 'tabler:sparkles']
] as const

export default function GymWorkspace() {
  const {
    data,
    loading,
    error,
    refresh,
    section,
    offline,
    recovery,
    clearRecovery
  } = useGym()

  const { t } = useModuleTranslation()

  const View = views[section]

  return (
    <>
      <ModuleHeader />
      <Stack gap="lg" mb="lg" minWidth="0">
        <Flex
          aria-label={t('navigation')}
          as="nav"
          display={{ base: 'flex', print: 'none' }}
          gap="sm"
          wrap="wrap"
        >
          {sections.map(([id, icon]) => (
            <Button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              as={Link}
              icon={icon}
              namespace={false}
              to={{ search: gymSectionParams(id).toString() }}
              variant={section === id ? 'primary' : 'secondary'}
              onFocus={() => {
                if (id !== 'dashboard')
                  void sectionLoaders[id]().catch(() => undefined)
              }}
              onMouseEnter={() => {
                if (id !== 'dashboard')
                  void sectionLoaders[id]().catch(() => undefined)
              }}
            >
              {t(`sections.${id}`)}
            </Button>
          ))}
        </Flex>
        {offline && (
          <Card role="status">
            <Text>{t('workout.offline')}</Text>
          </Card>
        )}
        {recovery && (!data || data.active?.id !== recovery.draft.id) && (
          <Card gap="md">
            <Text>
              {t('workout.recoveryAvailable', {
                name: recovery.draft.name,
                date: recovery.saved_at
              })}
            </Text>
            <Text>{t('workout.recoveryHelp')}</Text>
            <Flex gap="sm">
              <Button onClick={refresh}>retry</Button>
              <Button
                dangerous
                variant="plain"
                onClick={() => {
                  if (window.confirm(t('workout.clearRecoveryConfirm')))
                    clearRecovery()
                }}
              >
                clearRecovery
              </Button>
            </Flex>
          </Card>
        )}
        {error && (
          <Card gap="md" role="alert">
            <Text color="dangerous">{error}</Text>
            <Button variant="secondary" onClick={refresh}>
              retry
            </Button>
          </Card>
        )}
        {loading ? (
          <Flex align="center" gap="md" role="status">
            <Icon icon="svg-spinners:ring-resize" />
            <Text>{t('loading')}</Text>
          </Flex>
        ) : data ? (
          <Suspense
            fallback={
              <Flex align="center" gap="md" minHeight="12rem" role="status">
                <Icon aria-hidden="true" icon="svg-spinners:ring-resize" />
                <Text>{t('loading')}</Text>
              </Flex>
            }
          >
            <Stack
              key={section}
              aria-label={t(`sections.${section}`)}
              as="section"
              className="zillion-gym-section"
              minWidth="0"
            >
              <View />
            </Stack>
          </Suspense>
        ) : null}
      </Stack>
    </>
  )
}
