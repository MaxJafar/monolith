import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useDrag } from 'react-dnd'

import { useModuleTranslation } from '@monolith/localization'
import { Box, Card, Flex, Icon, Stack, Text } from '@monolith/ui'

import type { IdeaBoxIdea } from '@/providers/IdeaBoxProvider'

import EntryContextMenu from './EntryContextMenu'
import InFolderChip from './InFolderChip'
import TagChip from './TagChip'

dayjs.extend(relativeTime)

function IdeaWrapper({
  entry,
  children,
  onClick
}: {
  entry: IdeaBoxIdea
  children: React.ReactNode
  onClick?: () => void
}) {
  const { t } = useModuleTranslation()

  const [{ opacity, isDragging }, dragRef] = useDrag(
    () => ({
      type: 'IDEA',
      item: {
        targetId: entry.id,
        type: 'idea'
      },
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
        isDragging: !!monitor.isDragging()
      })
    }),
    []
  )

  return (
    <Card
      ref={node => {
        dragRef(node)
      }}
      isInteractive
      align="start"
      as="button"
      gap="sm"
      justify="between"
      my="md"
      style={{
        ...(isDragging ? { cursor: 'move' } : {}),
        opacity,
        textAlign: 'left'
      }}
      width="100%"
      onClick={onClick}
    >
      {entry.pinned && (
        <Box
          asChild
          left="-0.5rem"
          position="absolute"
          top="-0.5rem"
          zIndex="50"
        >
          <Icon
            color="red-500"
            icon="tabler:pin"
            size="1.25rem"
            style={{
              filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))',
              transform: 'rotate(-90deg)'
            }}
          />
        </Box>
      )}
      <Stack gap="sm" minWidth="0" width="100%">
        <Flex justify="between">
          <Flex align="center" gap="sm">
            <Icon
              color={{ base: 'bg-400', dark: 'bg-600' }}
              icon={
                {
                  text: 'tabler:article',
                  link: 'tabler:link',
                  image: 'tabler:photo'
                }[entry.type] || 'tabler:article'
              }
              size="1.25rem"
            />
            <Text
              as="h3"
              color={{ base: 'bg-400', dark: 'bg-600' }}
              weight="medium"
            >
              {t(`entryType.${entry.type}`)}
            </Text>
          </Flex>
          <EntryContextMenu entry={entry} />
        </Flex>
        {children}
        {entry.tags !== null && entry.tags?.length !== 0 && (
          <Flex gap="xs" wrap="wrap">
            {entry.tags?.map((tag: string, index: number) => (
              <TagChip key={index} text={tag} />
            ))}
          </Flex>
        )}
        <Text color="muted" size="sm">
          {dayjs(entry.created).fromNow()}
        </Text>
        {entry.type === 'text' && <InFolderChip entry={entry} />}
      </Stack>
    </Card>
  )
}

export default IdeaWrapper
