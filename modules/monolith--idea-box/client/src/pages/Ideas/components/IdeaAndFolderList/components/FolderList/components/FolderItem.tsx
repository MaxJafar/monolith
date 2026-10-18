import { useQueryClient } from '@tanstack/react-query'
import { useDrag, useDrop } from 'react-dnd'
import { Link, useParams } from 'react-router'

import { Box, Flex, Icon, Text, toast } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import type { IdeaBoxFolder } from '@/providers/IdeaBoxProvider'

import FolderContextMenu from './FolderContextMenu'

function getStyle({
  isOver,
  canDrop,
  folderColor,
  opacity
}: {
  isOver: boolean
  canDrop: boolean
  folderColor: string
  opacity: number
}) {
  const backgroundColor = `${folderColor}${(() => {
    if (!canDrop) return '20'

    return isOver ? '' : '50'
  })()}`

  const color = (() => {
    if (!canDrop) return folderColor

    return isOver ? '' : folderColor
  })()

  return {
    backgroundColor,
    color,
    opacity
  }
}

function FolderItem({ folder }: { folder: IdeaBoxFolder }) {
  const queryClient = useQueryClient()
  const { id, '*': path } = useParams<{ id: string; '*': string }>()

  const [{ opacity, isDragging }, dragRef] = useDrag(
    () => ({
      type: 'FOLDER',
      item: { targetId: folder.id, type: 'folder' },
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
        isDragging: !!monitor.isDragging()
      })
    }),
    [folder.id]
  )

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['IDEA', 'FOLDER'],
    canDrop: (item: { targetId: string; type: 'idea' | 'folder' }) =>
      item.type === 'idea' ||
      (item.type === 'folder' && item.targetId !== folder.id),
    drop: (e: { targetId: string; type: 'idea' | 'folder' }) => {
      putIntoFolder(e).catch(console.error)
    },
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }))

  const putIntoFolder = async ({
    targetId,
    type
  }: {
    targetId: string
    type: 'idea' | 'folder'
  }) => {
    if (type === 'folder' && targetId === folder.id) return

    try {
      await workspaceAPI[type === 'idea' ? 'ideas' : 'folders'].moveTo
        .input({
          id: targetId
        })
        .mutate({
          target: folder.id
        })

      queryClient.invalidateQueries({
        queryKey: ['ideaBox', 'ideas']
      })

      queryClient.invalidateQueries({
        queryKey: ['ideaBox', 'folders']
      })

      queryClient.invalidateQueries({
        queryKey: ['ideaBox', 'misc', 'search']
      })
    } catch {
      toast.error('Failed to move item')
    }
  }

  return (
    <Text
      key={folder.id}
      asChild
      color={canDrop && isOver ? { base: 'bg-50', dark: 'bg-800' } : undefined}
    >
      <Flex
        ref={node => {
          dragRef(node)
          drop(node)
        }}
        shadow
        as={Link}
        justify="between"
        p="md"
        position="relative"
        r="md"
        style={{
          ...getStyle({
            isOver,
            canDrop,
            folderColor: folder.color,
            opacity
          }),
          backdropFilter: 'blur(4px)',
          borderColor: folder.color + '20',
          cursor: isDragging ? 'move' : undefined,
          isolation: 'isolate',
          transition: 'all 150ms'
        }}
        to={`/idea-box/${id}/${path}/${folder.id}`.replace('//', '/')}
      >
        <Flex align="center" flex="1" minWidth="0" mr="sm">
          <Icon icon={folder.icon} mr="sm" size="1.25rem" />
          <Box asChild flex="1" minWidth="0">
            <Text truncate>{folder.name}</Text>
          </Box>
        </Flex>
        <FolderContextMenu folder={folder} isOver={isOver} />
      </Flex>
    </Text>
  )
}

export default FolderItem
