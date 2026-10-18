import { useApiMutation } from '@monolith/api'
import {
  Box,
  ConfirmationModal,
  ContextMenu,
  ContextMenuItem,
  useModalStore
} from '@monolith/ui'

import type { WalletAsset } from '@/hooks/useWalletData'
import { workspaceAPI } from '@/manifest'

import BalanceChartModal from '../modals/BalanceChartModal'
import ModifyAssetModal from '../modals/ModifyAssetModal'

function AssetContextMenu({ asset }: { asset: WalletAsset }) {
  const { open } = useModalStore()

  const deleteMutation = useApiMutation(
    workspaceAPI.assets.remove.input({ id: asset.id }),
    { action: 'delete', queryKey: workspaceAPI.assets.key }
  )

  const handleDelete = () =>
    open(ConfirmationModal, {
      title: 'Delete Asset',
      description: `Are you sure you want to delete the asset "${asset.name}"? This action cannot be undone.`,
      confirmationButton: 'delete',
      confirmationPrompt: asset.name,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(undefined)
      }
    })

  return (
    <Box position={{ base: 'absolute', md: 'static' }} right="1em" top="1em">
      <ContextMenu
        componentProps={{
          menu: {
            minWidth: '16em'
          }
        }}
      >
        <ContextMenuItem
          icon="tabler:chart-line"
          label="View Balance Chart"
          onClick={() => open(BalanceChartModal, { initialData: asset })}
        />
        <ContextMenuItem
          icon="tabler:pencil"
          label="Edit"
          onClick={() =>
            open(ModifyAssetModal, { type: 'update', initialData: asset })
          }
        />
        <ContextMenuItem
          dangerous
          icon="tabler:trash"
          label="Delete"
          onClick={handleDelete}
        />
      </ContextMenu>
    </Box>
  )
}

export default AssetContextMenu
