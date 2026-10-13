import { useCallback } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, EmptyStateScreen, WithQuery, useModalStore } from '@lifeforge/ui'

import { useIdeaBoxContext } from '@/providers/IdeaBoxProvider'

import ModifyIdeaModal from '../modals/ModifyIdeaModal'
import FolderList from './components/FolderList'
import IdeaList from './components/IdeaList'

function IdeaAndFolderList() {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const {
    entriesQuery,
    foldersQuery,
    searchResultsQuery,
    searchQuery,
    selectedTags,
    viewArchived
  } = useIdeaBoxContext()

  const handleIdeaCreation = useCallback(() => {
    open(ModifyIdeaModal, {
      type: 'create',
      initialData: {
        type: 'text'
      }
    })
  }, [])

  return (
    <Box mt="lg" style={{ marginBottom: '5rem' }}>
      {searchQuery.trim().length === 0 && selectedTags.length === 0 ? (
        <WithQuery query={entriesQuery}>
          {data => (
            <WithQuery query={foldersQuery}>
              {folders => (
                <>
                  {data.length === 0 && folders.length === 0 ? (
                    <Box mt="lg">
                      {!viewArchived ? (
                        <EmptyStateScreen
                          CTAButtonProps={{
                            children: 'new',
                            onClick: handleIdeaCreation,
                            icon: 'tabler:plus',
                            tProps: {
                              item: t('items.idea')
                            }
                          }}
                          icon="tabler:bulb-off"
                          message={{
                            id: 'idea'
                          }}
                        />
                      ) : (
                        <EmptyStateScreen
                          icon="tabler:archive-off"
                          message={{
                            id: 'archived'
                          }}
                        />
                      )}
                    </Box>
                  ) : (
                    <>
                      {folders.length > 0 && !viewArchived && <FolderList />}
                      {data.length > 0 && <IdeaList data={data} />}
                    </>
                  )}
                </>
              )}
            </WithQuery>
          )}
        </WithQuery>
      ) : (
        <WithQuery query={searchResultsQuery}>
          {searchResults => (
            <>
              {searchResults.length === 0 ? (
                <Box mt="lg">
                  <EmptyStateScreen
                    icon="tabler:search"
                    message={{
                      id: 'result'
                    }}
                  />
                </Box>
              ) : (
                <IdeaList data={searchResults} />
              )}
            </>
          )}
        </WithQuery>
      )}
    </Box>
  )
}

export default IdeaAndFolderList
