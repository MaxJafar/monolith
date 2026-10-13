import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback } from 'react'

import { useForgeMutation } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Text,
  useModalStore
} from '@lifeforge/ui'

import ModifyEventModal from '@/components/modals/ModifyEventModal'
import { forgeAPI } from '@/manifest'
import { eventSource } from '@/utils/calendarModel'

import type { CalendarCategory, CalendarEvent } from '../../..'

function EventDetailsHeader({
  event,
  category,
  editable = true
}: {
  event: CalendarEvent
  category: CalendarCategory | undefined
  editable?: boolean
}) {
  const { t } = useModuleTranslation()
  const { open } = useModalStore()
  const queryClient = useQueryClient()

  const addExceptionMutation = useMutation(
    forgeAPI.events.addException
      .input({
        id: event.id.replace(/-\d{8}_\d{2}:\d{2}:\d{2}$/, ''),
        date: dayjs(event.start).toISOString()
      })
      .mutationOptions({
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: forgeAPI.events.getByDateRange.key
          })
        }
      })
  )

  const handleAddException = useCallback(async () => {
    open(ConfirmationModal, {
      title: t('modals.confirmAddException.title'),
      description: t('modals.confirmAddException.description'),
      onConfirm: async () => {
        await addExceptionMutation.mutateAsync(undefined)
      }
    })
  }, [event.id])

  const handleEdit = useCallback(() => {
    open(ModifyEventModal, {
      initialData: event,
      type: 'update'
    })
  }, [event])

  const deleteMutation = useForgeMutation(
    forgeAPI.events.remove.input({
      id: event.id.replace(/-\d{8}_\d{2}:\d{2}:\d{2}$/, '')
    }),
    { action: 'delete', queryKey: forgeAPI.key }
  )

  const handleDelete = useCallback(() => {
    open(ConfirmationModal, {
      title: 'Delete Event',
      description: 'Are you sure you want to delete this event?',
      confirmationButton: 'delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      }
    })
  }, [event])

  return (
    <Flex align="start" as="header" gap="2xl" justify="between">
      <Flex direction="column">
        <Flex align="center" gap="xs">
          {event.category !== '' && (
            <Icon
              icon={category?.icon ?? ''}
              style={{ color: category?.color, flexShrink: 0 }}
            />
          )}
          <Text truncate color="muted">
            {category?.name}
          </Text>
        </Flex>
        <Text
          as="h3"
          color={{ base: 'bg-800', dark: 'bg-100' }}
          decoration={event.is_strikethrough ? 'line-through' : undefined}
          mt="xs"
          size="xl"
          weight="semibold"
        >
          {event.title}
        </Text>
      </Flex>
      {eventSource(event) === 'native' && editable && (
        <ContextMenu
          componentProps={{
            button: {
              p: 'sm'
            }
          }}
        >
          <ContextMenuItem
            icon="tabler:pencil"
            label="Edit"
            onClick={handleEdit}
          />
          {event.type === 'recurring' && (
            <ContextMenuItem
              dangerous
              icon="tabler:calendar-off"
              label="Except This Time"
              onClick={handleAddException}
            />
          )}
          <ContextMenuItem
            dangerous
            icon="tabler:trash"
            label="Delete"
            onClick={handleDelete}
          />
        </ContextMenu>
      )}
    </Flex>
  )
}

export default EventDetailsHeader
