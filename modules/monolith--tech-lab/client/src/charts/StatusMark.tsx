import { Icon } from '@monolith/ui'

export type LiveStatus =
  'up' | 'down' | 'warning' | 'pending' | 'maintenance' | 'off' | 'unknown'

const icons: Record<LiveStatus, string> = {
  up: 'lucide:circle-check',
  down: 'lucide:circle-x',
  warning: 'lucide:triangle-alert',
  pending: 'lucide:clock-alert',
  maintenance: 'lucide:wrench',
  off: 'lucide:circle-pause',
  unknown: 'lucide:circle-help'
}

/** State is carried by icon shape and a label, never by colour alone. */
export function StatusMark({
  status,
  label,
  hideLabel = false
}: {
  status: LiveStatus
  label: string
  hideLabel?: boolean
}) {
  return (
    <span
      className="tech-lab-status"
      data-status={status}
      title={hideLabel ? label : undefined}
    >
      <span className="tech-lab-status-icon">
        <Icon
          aria-hidden="true"
          icon={icons[status]}
          size="15px"
          // Status colour comes from the mark, not the workspace icon colour.
          style={{ color: 'inherit' }}
        />
      </span>
      <span className={hideLabel ? 'tech-lab-visually-hidden' : undefined}>
        {label}
      </span>
    </span>
  )
}
