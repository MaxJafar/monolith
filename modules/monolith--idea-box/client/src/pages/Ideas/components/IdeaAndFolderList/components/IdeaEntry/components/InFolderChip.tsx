import { useNavigate, useParams } from 'react-router'

import { Flex, TagChip, Text } from '@monolith/ui'

import {
  type IdeaBoxIdea,
  useIdeaBoxContext
} from '@/providers/IdeaBoxProvider'

function InFolderChip({ entry }: { entry: IdeaBoxIdea }) {
  const { setSearchQuery, setSelectedTags } = useIdeaBoxContext()
  const navigate = useNavigate()
  const { '*': path } = useParams<{ '*': string }>()

  if (!('fullPath' in entry) || !entry.expand || !entry.expand.folder) {
    return <></>
  }

  return (
    <Flex align="center" as="span" gap="sm" mt="sm">
      <Text size="sm">In</Text>
      <TagChip
        color={entry.expand.folder.color}
        icon={entry.expand.folder.icon}
        label={entry.expand.folder.name}
        onClick={e => {
          e.preventDefault()
          navigate(
            entry.expand.folder?.id ===
              path
                ?.split('/')
                .filter(e => e)
                .pop()
              ? ''
              : `.${entry.fullPath}`
          )
          setSelectedTags([])
          setSearchQuery('')
        }}
      />
    </Flex>
  )
}

export default InFolderChip
