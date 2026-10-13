import { Text } from '@lifeforge/ui'

function Unit({ label }: { label: string }) {
  return (
    <Text as="span" color="muted" pl="xs" size="3xl">
      {label}
    </Text>
  )
}

export default function DurationText({ seconds }: { seconds: number }) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return (
    <Text size="4xl" weight="semibold" whiteSpace="nowrap">
      {hours > 0 && (
        <>
          {hours}
          <Unit label="h" />{' '}
        </>
      )}
      {minutes.toString().padStart(2, '0')}
      <Unit label="m" /> {secs.toString().padStart(2, '0')}
      <Unit label="s" />
    </Text>
  )
}
