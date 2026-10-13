import { useCallback } from 'react'
import { Link } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Flex, Icon } from '@lifeforge/ui'

import { useIdeaBoxContext } from '@/providers/IdeaBoxProvider'

function ContainerName({
  id,
  name,
  icon,
  color
}: {
  id: string
  name: string
  icon: string
  color: string
}) {
  const { t } = useModuleTranslation()
  const { setSelectedTags, setSearchQuery, viewArchived } = useIdeaBoxContext()

  const handleNavigateToRoot = useCallback(() => {
    setSelectedTags([])
    setSearchQuery('')
  }, [])

  return (
    <Flex asChild align="center" gap="lg">
      <Link to={`/idea-box/${id}`} onClick={handleNavigateToRoot}>
        <Box
          p="md"
          r="lg"
          style={{
            backgroundColor: color + '20',
            borderColor: color,
            borderWidth: '2px'
          }}
        >
          <Icon icon={icon} size={{ base: '1.5rem' }} style={{ color }} />
        </Box>
        {viewArchived ? t('archivedIdeaIn', { container: name }) : name}
      </Link>
    </Flex>
  )
}

export default ContainerName
