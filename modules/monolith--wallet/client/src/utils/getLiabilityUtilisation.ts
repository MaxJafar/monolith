import type { WalletAsset } from '@/hooks/useWalletData'

export default function getLiabilityUtilisation(asset: WalletAsset) {
  const used = Math.abs(asset.current_balance)

  const limit = asset.credit_limit

  const hasLimit = asset.is_liability && limit > 0

  const percentage = hasLimit ? (used / limit) * 100 : 0

  const over = hasLimit && used > limit

  return {
    used,
    limit,
    hasLimit,
    percentage,
    over,
    overBy: over ? used - limit : 0
  }
}
