import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ContextMenu,
  ContextMenuItem,
  Flex,
  ModuleHeader,
  Stack
} from '@monolith/ui'

import BoardPanel from './components/BoardPanel'
import CategoriesPanel from './components/CategoriesPanel'
import ColumnsPanel from './components/ColumnsPanel'
import EntriesPanel from './components/EntriesPanel'
import StatusesPanel from './components/StatusesPanel'
import TasksPanel from './components/TasksPanel'
import TechnologiesPanel from './components/TechnologiesPanel'
import VisibilitiesPanel from './components/VisibilitiesPanel'

const panels = {
  categories: CategoriesPanel,
  statuses: StatusesPanel,
  technologies: TechnologiesPanel,
  visibilities: VisibilitiesPanel,
  entries: EntriesPanel,
  columns: ColumnsPanel,
  tasks: TasksPanel,
  board: BoardPanel
}

export default function Projects() {
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()

  const requested = params.get('panel') ?? 'board'
  const active: keyof typeof panels = Object.prototype.hasOwnProperty.call(
    panels,
    requested
  )
    ? (requested as keyof typeof panels)
    : 'board'
  const setActive = (panel: keyof typeof panels) =>
    setParams(current => {
      const next = new URLSearchParams(current)
      next.set('panel', panel)

      return next
    })

  const Panel = panels[active]

  return (
    <>
      <ModuleHeader />
      <Box flex="1" minHeight="0" minWidth="0" overflowY="auto">
        <Stack gap="lg" width="100%">
          <Flex
            aria-label={t('title')}
            className="monolith-view-tabs"
            gap="sm"
            minWidth="0"
            overflowX="auto"
            role="navigation"
            wrap="nowrap"
          >
            {(['board', 'entries', 'tasks'] as const).map(entity => (
              <Button
                key={entity}
                aria-current={active === entity ? 'page' : undefined}
                icon={
                  {
                    board: 'tabler:layout-kanban',
                    entries: 'tabler:briefcase',
                    tasks: 'tabler:list-check'
                  }[entity]
                }
                namespace={false}
                variant="plain"
                onClick={() => setActive(entity)}
              >
                {t(entity === 'board' ? entity : 'entities.' + entity)}
              </Button>
            ))}
            <ContextMenu
              customIcon="tabler:adjustments"
              componentProps={{ button: { 'aria-label': t('manage') } }}
            >
              {(
                [
                  'columns',
                  'categories',
                  'statuses',
                  'technologies',
                  'visibilities'
                ] as const
              ).map(entity => (
                <ContextMenuItem
                  key={entity}
                  label={`entities.${entity}`}
                  checked={active === entity}
                  onClick={() => setActive(entity)}
                />
              ))}
            </ContextMenu>
          </Flex>
          <Panel key={active} />
        </Stack>
      </Box>
    </>
  )
}
