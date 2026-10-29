import { Suspense, lazy } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Flex,
  Icon,
  ModuleHeader,
  Stack,
  Text
} from '@monolith/ui'

import { useTechLab } from './TechLabContext'
import { sectionParams } from './utils/navigation'
import OverviewView from './views/OverviewView'

const views = {
  overview: OverviewView,
  devices: lazy(() => import('./views/DevicesView')),
  services: lazy(() => import('./views/ServicesView')),
  health: lazy(() => import('./views/HealthView')),
  import: lazy(() => import('./views/ImportView'))
}
const navigation = [
  ['overview', 'lucide:layout-dashboard'],
  ['devices', 'lucide:server'],
  ['services', 'lucide:panels-top-left'],
  ['health', 'lucide:activity'],
  ['import', 'lucide:database-backup']
] as const

export default function TechLabWorkspace() {
  const { data, section, loading, refreshing, error, refresh } = useTechLab()
  const { t } = useModuleTranslation()

  const View = views[section]

  return (
    <>
      <ModuleHeader
        trailing={
          <Button
            icon="lucide:refresh-cw"
            loading={refreshing}
            variant="secondary"
            onClick={refresh}
          >
            refresh
          </Button>
        }
      />
      <Stack gap="lg" mb="lg" minWidth="0">
        <Flex
          aria-label={t('navigation')}
          as="nav"
          className="tech-lab-navigation"
          gap="xs"
          wrap="wrap"
        >
          {navigation.map(([id, icon]) => (
            <Button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              as={Link}
              icon={icon}
              to={{ search: sectionParams(id).toString() }}
              variant="plain"
            >{`sections.${id}`}</Button>
          ))}
        </Flex>
        {error && (
          <Card gap="md" role="alert">
            <Text color="dangerous">{error}</Text>
            <Text color="muted">{t('messages.failureHelp')}</Text>
            <Button variant="secondary" onClick={refresh}>
              retry
            </Button>
          </Card>
        )}
        {loading ? (
          <Loading />
        ) : data ? (
          <Suspense fallback={<Loading />}>
            <Stack
              key={section}
              aria-label={t(`sections.${section}`)}
              as="section"
              className="tech-lab-section"
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

function Loading() {
  const { t } = useModuleTranslation()

  return (
    <Flex align="center" gap="md" minHeight="10rem" role="status">
      <Icon aria-hidden="true" icon="svg-spinners:ring-resize" />
      <Text>{t('loading')}</Text>
    </Flex>
  )
}
