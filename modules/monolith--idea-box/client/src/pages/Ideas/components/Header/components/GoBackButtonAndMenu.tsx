import { memo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ContextMenu, ContextMenuItem, Flex, GoBackButton } from '@monolith/ui'

import { useIdeaBoxContext } from '@/providers/IdeaBoxProvider'

function GoBackButtonAndMenu() {
  const navigate = useNavigate()
  const location = useLocation()

  const { viewArchived, setViewArchived, setSearchQuery, setSelectedTags } =
    useIdeaBoxContext()

  const handleGoBack = useCallback(() => {
    if (viewArchived) {
      setViewArchived(false)
    }
    setSearchQuery('')
    setSelectedTags([])
    navigate(location.pathname.split('/').slice(0, -1).join('/'))
  }, [viewArchived, location.pathname, navigate])

  const handleViewArchive = useCallback(() => {
    setViewArchived(prev => !prev)
    setSearchQuery('')
    setSelectedTags([])
  }, [])

  return (
    <Flex justify="between" width="100%">
      <GoBackButton onClick={handleGoBack} />
      <ContextMenu>
        <ContextMenuItem
          icon={viewArchived ? 'tabler:archive-off' : 'tabler:archive'}
          label={viewArchived ? 'View Active' : 'View Archived'}
          onClick={handleViewArchive}
        />
      </ContextMenu>
    </Flex>
  )
}

export default memo(GoBackButtonAndMenu)
