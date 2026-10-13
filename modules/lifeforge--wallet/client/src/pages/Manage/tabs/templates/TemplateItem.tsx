import { useQuery } from '@tanstack/react-query'

import { useForgeMutation } from '@lifeforge/api'
import { useModalStore } from '@lifeforge/ui'

import type { WalletTemplate } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'
import ModifyTemplatesModal from '@/pages/Manage/components/modals/ModifyTemplatesModal'
import ModifyTransactionsModal from '@/pages/Transactions/modals/ModifyTransactionsModal'

import ManageItem from '../../components/ManageItem'

function TemplateItem({
  template,
  choosing,
  onClose
}: {
  template: WalletTemplate
  choosing: boolean
  onClose: () => void
}) {
  const { open } = useModalStore()
  const categoriesQuery = useQuery(forgeAPI.categories.list.queryOptions())

  const deleteMutation = useForgeMutation(
    forgeAPI.templates.remove.input({ id: template.id }),
    { action: 'delete', queryKey: forgeAPI.templates.key }
  )

  const targetCategory = (categoriesQuery.data ?? []).find(
    cat => cat.id === template.category
  )

  return (
    <ManageItem
      color={targetCategory?.color}
      deleteDescription="Are you sure you want to delete this template?"
      deleteTitle="Delete Template"
      icon={targetCategory?.icon || 'tabler:template'}
      name={template.name}
      onClick={
        choosing
          ? () => {
              onClose()
              open(ModifyTransactionsModal, {
                type: 'create',
                initialData: {
                  ...template,
                  asset: template.asset ?? undefined,
                  category: template.category ?? undefined
                }
              })
            }
          : undefined
      }
      onDelete={
        choosing ? undefined : () => deleteMutation.mutateAsync(undefined)
      }
      onEdit={
        choosing
          ? undefined
          : () =>
              open(ModifyTemplatesModal, {
                type: 'update',
                initialData: template
              })
      }
    />
  )
}

export default TemplateItem
