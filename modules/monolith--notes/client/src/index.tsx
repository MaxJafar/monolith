import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Button, Flex, ModuleHeader, Stack } from '@monolith/ui'

import EntriesPanel from './components/EntriesPanel'
import SubjectsPanel from './components/SubjectsPanel'
import WorkspacesPanel from './components/WorkspacesPanel'

const panels = {
  workspaces: WorkspacesPanel,
  subjects: SubjectsPanel,
  entries: EntriesPanel
}

export default function Notes() {
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()

  const requested = params.get('panel')
  const active =
    requested === 'workspaces' || requested === 'subjects'
      ? requested
      : 'entries'

  const Panel = panels[active]

  return (
    <>
      <ModuleHeader />
      <Box flex="1" minHeight="0" overflowY="auto" p={{ base: 'sm', md: 'lg' }}>
        <Stack gap="lg" maxWidth="80rem" width="100%">
          <Flex aria-label={t('title')} gap="sm" role="navigation" wrap="wrap">
            {(Object.keys(panels) as (keyof typeof panels)[]).map(entity => (
              <Button
                key={entity}
                aria-pressed={active === entity}
                namespace={false}
                variant={active === entity ? 'primary' : 'secondary'}
                onClick={() => setParams({ panel: entity })}
              >
                {t('entities.' + entity)}
              </Button>
            ))}
          </Flex>
          <Panel key={active} />
        </Stack>
      </Box>
    </>
  )
}
