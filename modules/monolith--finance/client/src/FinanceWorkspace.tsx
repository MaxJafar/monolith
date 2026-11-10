import { Suspense, lazy } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, ModuleHeader, Stack, Text } from '@monolith/ui'

import { useFinance } from './FinanceContext'
import { Loading, Segmented } from './components/controls'
import { useEditors } from './editors/useEditors'
import { sectionParams, sections } from './utils/navigation'
import OverviewView from './views/OverviewView'
import SetupView from './views/SetupView'

const views = {
  overview: OverviewView,
  activity: lazy(() => import('./views/ActivityView')),
  accounts: lazy(() => import('./views/AccountsView')),
  categories: lazy(() => import('./views/CategoriesView')),
  wishlist: lazy(() => import('./views/WishlistView')),
  plan: lazy(() => import('./views/PlanView')),
  taxes: lazy(() => import('./views/TaxesView')),
  settings: lazy(() => import('./views/SettingsView'))
}

export default function FinanceWorkspace() {
  const finance = useFinance()

  const { data, section, loading, refreshing, error, refresh, params } = finance

  const { t } = useModuleTranslation()
  const editors = useEditors()

  const View = views[section]
  const configured = !!data?.settings.configured
  const toggles = (data?.settings.currencies ?? []).slice(0, 6)

  return (
    <div className="finance-root">
      <ModuleHeader
        trailing={
          configured ? (
            <Flex align="center" gap="sm" wrap="wrap">
              {toggles.length > 1 && (
                <Segmented
                  label={t('display.toggle')}
                  options={toggles.map(code => ({ value: code, label: code }))}
                  size="small"
                  value={finance.display}
                  onChange={finance.setDisplay}
                />
              )}
              <Button
                aria-label={t('buttons.refresh')}
                icon="tabler:refresh"
                loading={refreshing}
                variant="plain"
                onClick={refresh}
              />
              <Button icon="tabler:plus" onClick={() => editors.transaction()}>
                addTransaction
              </Button>
            </Flex>
          ) : undefined
        }
      />
      <Stack gap="lg" mb="lg" minWidth="0">
        {configured && (
          <Flex
            aria-label={t('navigation')}
            as="nav"
            className="finance-navigation"
            gap="xs"
          >
            {sections.map(([id, icon]) => (
              <Button
                key={id}
                aria-current={section === id ? 'page' : undefined}
                as={Link}
                icon={icon}
                to={{ search: sectionParams(id, {}, params).toString() }}
                variant="plain"
              >{`sections.${id}`}</Button>
            ))}
          </Flex>
        )}
        {error && (
          <Card gap="md" role="alert">
            <Text color="dangerous">{error}</Text>
            <Flex gap="sm">
              <Button variant="secondary" onClick={refresh}>
                retry
              </Button>
              <Button variant="plain" onClick={finance.clearError}>
                dismiss
              </Button>
            </Flex>
          </Card>
        )}
        {loading ? (
          <Loading label={t('loading')} />
        ) : !data ? null : !configured ? (
          <SetupView />
        ) : (
          <Suspense fallback={<Loading label={t('loading')} />}>
            <Stack
              key={section}
              aria-label={t(`sections.${section}`)}
              as="section"
              className="finance-section"
              gap="lg"
              minWidth="0"
            >
              <View />
            </Stack>
          </Suspense>
        )}
      </Stack>
    </div>
  )
}
