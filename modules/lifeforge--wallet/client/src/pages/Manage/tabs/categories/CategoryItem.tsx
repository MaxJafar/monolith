import { useNavigate } from 'react-router'

import { useForgeMutation } from '@lifeforge/api'
import { useModalStore } from '@lifeforge/ui'

import type { EntityBreakdown } from '@/hooks/useEntityBreakdown'
import type { WalletCategory } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'
import ModifyCategoryModal from '@/pages/Manage/components/modals/ModifyCategoryModal'
import { useWalletRange } from '@/providers/RangeProvider'
import getDateRange from '@/utils/getDateRange'

import ManageItem from '../../components/ManageItem'

function CategoryItem({
  category,
  breakdown
}: {
  category: WalletCategory
  breakdown: EntityBreakdown[string] | undefined
}) {
  const { open } = useModalStore()
  const navigate = useNavigate()
  const { range, startDate, endDate } = useWalletRange()

  const deleteMutation = useForgeMutation(
    forgeAPI.categories.remove.input({ id: category.id }),
    { action: 'delete', queryKey: forgeAPI.categories.key }
  )

  const handleClick = () => {
    const params = new URLSearchParams({ category: category.id })

    const dates = getDateRange(
      range,
      startDate || undefined,
      endDate || undefined
    )

    if (dates.startDate) params.set('startDate', dates.startDate)

    if (dates.endDate) params.set('endDate', dates.endDate)

    navigate(`/wallet/transactions?${params.toString()}`)
  }

  return (
    <ManageItem
      color={category.color}
      count={breakdown?.count}
      deleteDescription="Are you sure you want to delete this category?"
      deleteTitle="Delete Category"
      expenses={breakdown?.expenses}
      icon={category.icon}
      income={breakdown?.income}
      name={category.name}
      onClick={handleClick}
      onDelete={() => deleteMutation.mutateAsync(undefined)}
      onEdit={() =>
        open(ModifyCategoryModal, { type: 'update', initialData: category })
      }
    />
  )
}

export default CategoryItem
