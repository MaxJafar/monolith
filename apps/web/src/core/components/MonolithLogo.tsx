import { Box } from '@monolith/ui'

/** The shared right-facing monolith, with a gray left side and black tile. */
export default function MonolithLogo({
  size = '32px'
}: {
  size?: string | number
}) {
  const dimension = typeof size === 'number' ? `${size}px` : size

  return (
    <Box
      alt=""
      aria-hidden="true"
      as="img"
      draggable={false}
      flexShrink="0"
      height={dimension}
      src="/icon.svg"
      width={dimension}
    />
  )
}
