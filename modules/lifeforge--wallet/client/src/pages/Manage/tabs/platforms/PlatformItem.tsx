import { useNavigate } from 'react-router'

import { useForgeMutation } from '@lifeforge/api'
import { useModalStore } from '@lifeforge/ui'

import type { EntityBreakdown } from '@/hooks/useEntityBreakdown'
import type { WalletPlatform } from '@/hooks/useWalletData'
import { forgeAPI } from '@/manifest'
import ModifyPlatformModal from '@/pages/Manage/components/modals/ModifyPlatformModal'
import { useWalletRange } from '@/providers/RangeProvider'
import getDateRange from '@/utils/getDateRange'

import ManageItem from '../../components/ManageItem'

function PlatformItem({
  platform,
  breakdown
}: {
  platform: WalletPlatform
  breakdown: EntityBreakdown[string] | undefined
}) {
  const { open } = useModalStore()
  const navigate = useNavigate()
  const { range, startDate, endDate } = useWalletRange()

  const deleteMutation = useForgeMutation(
    forgeAPI.platforms.remove.input({ id: platform.id }),
    { action: 'delete', queryKey: forgeAPI.platforms.key }
  )

  const handleClick = () => {
    const params = new URLSearchParams({ platform: platform.id })

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
      color={platform.color}
      count={breakdown?.count}
      deleteDescription="Are you sure you want to delete this platform?"
      deleteTitle="Delete Platform"
      expenses={breakdown?.expenses}
      icon={platform.icon}
      income={breakdown?.income}
      name={platform.name}
      onClick={handleClick}
      onDelete={() => deleteMutation.mutateAsync(undefined)}
      onEdit={() =>
        open(ModifyPlatformModal, { type: 'update', initialData: platform })
      }
    />
  )
}

export default PlatformItem
