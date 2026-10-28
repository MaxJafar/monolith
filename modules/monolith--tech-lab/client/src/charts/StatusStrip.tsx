import { useState } from 'react'

export type StripStatus =
  'up' | 'down' | 'partial' | 'pending' | 'maintenance' | 'empty'

/** One thin bar per heartbeat or time bucket, oldest first, newest on the right. */
export function StatusStrip({
  cells,
  label
}: {
  cells: { status: StripStatus; label: string }[]
  label: string
}) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <div
      aria-label={label}
      className="tech-lab-strip"
      role="img"
      onPointerLeave={() => setActive(null)}
    >
      {cells.map((cell, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-active={active === index || undefined}
          data-status={cell.status}
          onPointerEnter={() => setActive(index)}
        />
      ))}
      {active !== null && cells[active] && (
        <span
          className="tech-lab-strip-tip"
          data-edge={
            active < cells.length * 0.2
              ? 'start'
              : active > cells.length * 0.8
                ? 'end'
                : undefined
          }
          style={{ left: `${((active + 0.5) / cells.length) * 100}%` }}
        >
          {cells[active].label}
        </span>
      )}
    </div>
  )
}
