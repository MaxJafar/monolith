import { useDatabases } from '@/DatabaseProvider'

import type { RecordPage } from '../../../shared'
import { colorStyle, recordColor } from './recordColors'

export { colorStyle, recordColor, valueColor } from './recordColors'

export function useViewColors() {
  const { data, selectedViewId, base } = useDatabases()

  const view =
    data.views.find(item => item.id === selectedViewId) ??
    data.views.find(item => item.base_id === base?.id)

  return {
    config: view?.config.color,
    style: (record: RecordPage) =>
      colorStyle(recordColor(record, view?.config.color, data.fields))
  }
}
