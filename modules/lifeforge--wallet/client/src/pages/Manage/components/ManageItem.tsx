import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  Card,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  Flex,
  Icon,
  Stack,
  Text,
  surface,
  useModalStore
} from '@lifeforge/ui'

import numberToCurrency from '@/utils/numberToCurrency'

function ManageItem({
  color,
  icon,
  name,
  count,
  income,
  expenses,
  onClick,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
  deleteConfirmationPrompt
}: {
  color?: string
  icon: string
  name: string
  count?: number
  income?: number
  expenses?: number
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void | Promise<void>
  deleteTitle?: string
  deleteDescription?: string
  deleteConfirmationPrompt?: string
}) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const handleDelete = () => {
    open(ConfirmationModal, {
      title: deleteTitle ?? 'Delete',
      description: deleteDescription ?? '',
      confirmationButton: 'delete',
      confirmationPrompt: deleteConfirmationPrompt,
      onConfirm: async () => {
        await onDelete?.()
      }
    })
  }

  const hasAmounts = Boolean(income || expenses)

  const amounts = (
    <>
      {income ? (
        <Text color="green-500" size="sm" weight="medium">
          + RM {numberToCurrency(income)}
        </Text>
      ) : null}
      {expenses ? (
        <Text color="red-500" size="sm" weight="medium">
          - RM {numberToCurrency(expenses)}
        </Text>
      ) : null}
    </>
  )

  return (
    <Card
      align="center"
      bg={onClick ? surface.lightInteractive : surface.light}
      direction="row"
      gap="md"
      isInteractive={onClick !== undefined}
      justify="between"
      onClick={onClick}
    >
      <Flex align="center" gap="md" minWidth="0" width="100%">
        <Box
          p="sm"
          r="md"
          style={{ backgroundColor: color ? `${color}20` : undefined }}
        >
          <Icon icon={icon} size="1.75rem" style={{ color }} />
        </Box>
        <Stack gap="none" minWidth="0" width="100%">
          <Text truncate size="lg" weight="medium">
            {name}
          </Text>
          {count !== undefined && (
            <Text color="muted" size="sm">
              {count} {t('transactionCount')}
            </Text>
          )}
          {hasAmounts && (
            <Flex
              direction="column"
              display={{ base: 'flex', lg: 'none' }}
              gap="none"
            >
              {amounts}
            </Flex>
          )}
        </Stack>
      </Flex>
      <Flex align="center" flexShrink="0" gap="md">
        {hasAmounts && (
          <Flex
            align="end"
            direction="column"
            display={{ base: 'none', lg: 'flex' }}
            gap="none"
          >
            {amounts}
          </Flex>
        )}
        {(onEdit || onDelete) && (
          <ContextMenu>
            {onEdit && (
              <ContextMenuItem
                icon="tabler:pencil"
                label="Edit"
                onClick={onEdit}
              />
            )}
            {onDelete && (
              <ContextMenuItem
                dangerous
                icon="tabler:trash"
                label="Delete"
                onClick={handleDelete}
              />
            )}
          </ContextMenu>
        )}
      </Flex>
    </Card>
  )
}

export default ManageItem
