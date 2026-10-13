import { useQuery } from '@tanstack/react-query'

import { type InferOutput } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Button,
  ContentWrapperWithSidebar,
  EmptyStateScreen,
  FAB,
  LayoutWithSidebar,
  ModuleHeader,
  Scrollbar,
  Stack,
  TAILWIND_PALETTE,
  WithQuery,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import EntryItem from './components/EntryItem'
import InnerHeader from './components/InnerHeader'
import Sidebar from './components/Sidebar'
import ModifyAchievementModal from './components/modals/ModifyAchievementModal'
import useFilter from './hooks/useFilter'

export type Achievement = InferOutput<typeof forgeAPI.entries.list>[number]

export type AchievementCategory = InferOutput<
  typeof forgeAPI.categories.list
>[number]

export const DIFFICULTIES = {
  easy: TAILWIND_PALETTE.green[500],
  medium: TAILWIND_PALETTE.yellow[500],
  hard: TAILWIND_PALETTE.red[500],
  impossible: TAILWIND_PALETTE.purple[500]
}

function Achievements() {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const { filter, searchQuery } = useFilter()

  const entriesQuery = useQuery(
    forgeAPI.entries.list
      .input({
        difficulty:
          (filter.difficulty as Achievement['difficulty']) || undefined,
        category: filter.category || undefined,
        query: searchQuery || undefined
      })
      .queryOptions()
  )

  const handleCreateAchievement = () => {
    open(ModifyAchievementModal, {
      modifyType: 'create'
    })
  }

  return (
    <>
      <ModuleHeader
        trailing={
          <Button
            display={{ base: 'none', md: 'flex' }}
            icon="tabler:plus"
            tProps={{
              item: t('items.achievement')
            }}
            onClick={handleCreateAchievement}
          >
            new
          </Button>
        }
      />
      <LayoutWithSidebar>
        <Sidebar />
        <ContentWrapperWithSidebar>
          <InnerHeader totalItemsCount={entriesQuery.data?.length || 0} />
          <WithQuery query={entriesQuery}>
            {entries =>
              entries.length ? (
                <Box asChild mt="lg">
                  <Scrollbar>
                    <Stack mb="xl">
                      {entries.map(entry => (
                        <EntryItem key={entry.id} entry={entry} />
                      ))}
                    </Stack>
                    <FAB
                      visibilityBreakpoint="md"
                      onClick={handleCreateAchievement}
                    />
                  </Scrollbar>
                </Box>
              ) : (
                <EmptyStateScreen
                  icon="tabler:award-off"
                  message={{
                    id: 'achievements'
                  }}
                />
              )
            }
          </WithQuery>
        </ContentWrapperWithSidebar>
      </LayoutWithSidebar>
    </>
  )
}

export default Achievements
