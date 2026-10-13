import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Link } from 'react-router'

import {
  Box,
  Card,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Text,
  toast,
  useModalStore
} from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import type { IdeaBoxContainer } from '@/providers/IdeaBoxProvider'

import ModifyContainerModal from '../../ModifyContainerModal'

function ContainerItem({ container }: { container: IdeaBoxContainer }) {
  const queryClient = useQueryClient()
  const { open } = useModalStore()
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const showMenu = hovered || menuOpen

  const deleteMutation = useMutation(
    forgeAPI.containers.remove
      .input({
        id: container.id
      })
      .mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['ideaBox', 'containers']
          })
        },
        onError: () => {
          toast.error('Failed to delete container')
        }
      })
  )

  const togglePinMutation = useMutation(
    forgeAPI.containers.togglePin
      .input({
        id: container.id
      })
      .mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['ideaBox', 'containers']
          })
        },
        onError: () => {
          toast.error('Failed to toggle pin')
        }
      })
  )

  const toggleHideMutation = useMutation(
    forgeAPI.containers.toggleHide
      .input({
        id: container.id
      })
      .mutationOptions({
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['ideaBox', 'containers']
          })
        },
        onError: () => {
          toast.error('Failed to toggle hide')
        }
      })
  )

  const handleUpdateContainer = useCallback(() => {
    open(ModifyContainerModal, {
      type: 'update',
      initialData: container
    })
  }, [container])

  const handleDeleteContainer = useCallback(() => {
    open(ConfirmationModal, {
      title: 'Delete Container',
      description: 'Are you sure you want to delete this container?',
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      },
      confirmationButton: 'delete',
      confirmationPrompt: container.name
    })
  }, [container])

  return (
    <Card
      isInteractive
      align="center"
      as="li"
      justify="start"
      p="none"
      style={{ cursor: 'default' }}
      tabIndex={-1}
      onBlur={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {container.pinned && (
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
      <Flex
        centered
        aspectRatio="16 / 9"
        bg={{ base: 'bg-200', dark: 'bg-800' }}
        overflow="hidden"
        rtl="lg"
        rtr="lg"
        width="100%"
      >
        {container.cover !== '' ? (
          <img
            alt=""
            src={forgeAPI.getMedia({
              key: container.cover,
              thumb: '0x300'
            })}
            style={{
              aspectRatio: '16 / 9',
              height: '100%',
              objectFit: 'cover',
              width: '100%'
            }}
          />
        ) : (
          <Icon
            color={{ base: 'bg-300', dark: 'bg-700' }}
            icon="tabler:bulb"
            size="6rem"
          />
        )}
      </Flex>
      <Flex
        align="center"
        direction="column"
        gap="lg"
        justify="start"
        p="lg"
        position="relative"
        width="100%"
      >
        <Box
          bg="bg-950"
          overflow="hidden"
          r="lg"
          style={{ marginTop: '-3rem' }}
        >
          <Box
            p="md"
            r="lg"
            style={{ backgroundColor: container.color + '30' }}
          >
            <Icon
              icon={container.icon}
              size="2rem"
              style={{ color: container.color }}
            />
          </Box>
        </Box>
        <Flex align="center" gap="sm">
          <Text align="center" size="2xl" weight="medium">
            {container.name}
          </Text>
          {container.hidden && (
            <Icon color="muted" icon="tabler:eye-off" size="1.25rem" />
          )}
        </Flex>
        <Flex align="center" gap="sm" style={{ marginTop: 'auto' }}>
          <Flex align="center" gap="sm">
            <Icon color="muted" icon="tabler:article" size="1.25rem" />
            <Text color="muted">{container.text_count}</Text>
          </Flex>
          <Flex align="center" gap="sm">
            <Icon color="muted" icon="tabler:link" size="1.25rem" />
            <Text color="muted">{container.link_count}</Text>
          </Flex>
          <Flex align="center" gap="sm">
            <Icon color="muted" icon="tabler:photo" size="1.25rem" />
            <Text color="muted">{container.image_count}</Text>
          </Flex>
        </Flex>
        <Box
          asChild
          inset="0"
          position="absolute"
          style={{ cursor: 'pointer' }}
        >
          <Link to={`/idea-box/${container.id}`} />
        </Box>
      </Flex>
      <ContextMenu
        align="end"
        componentProps={{
          button: {
            bg: {
              base: 'bg-100',
              dark: 'bg-800',
              hover: 'bg-200',
              darkHover: 'bg-700'
            },
            iconProps: { color: { base: 'bg-500', dark: 'bg-600' } }
          }
        }}
        position="absolute"
        right="0.5rem"
        style={{
          opacity: showMenu ? 1 : 0,
          transition: 'opacity 150ms'
        }}
        top="0.5rem"
        zIndex="100"
        onOpenChange={setMenuOpen}
      >
        <ContextMenuItem
          icon={container.pinned ? 'tabler:pinned-off' : 'tabler:pin'}
          label={container.pinned ? 'Unpin' : 'Pin'}
          onClick={() => togglePinMutation.mutate(undefined)}
        />
        <ContextMenuItem
          icon={container.hidden ? 'tabler:eye' : 'tabler:eye-off'}
          label={container.hidden ? 'Unhide' : 'Hide'}
          onClick={() => toggleHideMutation.mutate(undefined)}
        />
        <ContextMenuItem
          icon="tabler:pencil"
          label="Edit"
          onClick={handleUpdateContainer}
        />
        <ContextMenuItem
          dangerous
          icon="tabler:trash"
          label="Delete"
          onClick={handleDeleteContainer}
        />
      </ContextMenu>
    </Card>
  )
}

export default ContainerItem
