import { useModuleTranslation } from '@monolith/localization'
import { COLORS, TagChip } from '@monolith/ui'

import type { ServiceHealth } from '../../../shared'

const visual = {
  up: { color: COLORS.primary, icon: 'lucide:circle-check' },
  down: { color: COLORS.dangerous, icon: 'lucide:circle-x' },
  error: { color: COLORS.dangerous, icon: 'lucide:triangle-alert' },
  stale: { color: 'var(--accent-amber)', icon: 'lucide:clock-alert' },
  disabled: { color: COLORS.muted, icon: 'lucide:pause' },
  unknown: { color: COLORS.muted, icon: 'lucide:circle-help' }
}

export function HealthBadge({ status }: { status: ServiceHealth['status'] }) {
  const { t } = useModuleTranslation()

  return (
    <TagChip
      label={t(`status.${status}`)}
      {...visual[status]}
      variant="outlined"
    />
  )
}
