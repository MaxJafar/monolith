import { Box } from '@lifeforge/ui'

/** An original architectural M, shared with the app and desktop icons. */
export default function MonolithLogo({
  size = '32px'
}: {
  size?: string | number
}) {
  const dimension = typeof size === 'number' ? `${size}px` : size

  return (
    <Box
      aria-hidden="true"
      as="svg"
      focusable="false"
      height={dimension}
      viewBox="0 0 64 64"
      width={dimension}
    >
      <rect
        width="64"
        height="64"
        rx="12"
        fill="var(--text-primary, #252525)"
      />
      <path
        d="M16 48V16h8l8 14 8-14h8v32h-8V30l-8 13-8-13v18z"
        fill="var(--bg-primary, #fff)"
      />
    </Box>
  )
}
