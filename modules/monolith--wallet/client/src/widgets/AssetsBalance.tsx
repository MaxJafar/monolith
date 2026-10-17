import type { WidgetConfig } from '@monolith/configs'

import AssetsBalance from '@/components/AssetsBalance'

export default function AssetsBalanceWidget() {
  return <AssetsBalance isWidget />
}

export const config: WidgetConfig = {
  id: 'assetsBalance',
  icon: 'tabler:coin'
}
