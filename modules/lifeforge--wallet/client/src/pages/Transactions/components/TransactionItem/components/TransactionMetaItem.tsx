import { Flex, Icon, Text } from '@lifeforge/ui'

function TransactionMetaItem({
  icon,
  label,
  color,
  truncate
}: {
  icon?: string
  label: string
  color?: string
  truncate?: boolean
}) {
  return (
    <Flex align="center" gap="xs" minWidth="0">
      {icon && (
        <Icon icon={icon} size="1rem" style={color ? { color } : undefined} />
      )}
      <Text
        color="muted"
        display={icon ? { base: 'none', md: 'block' } : 'block'}
        size="sm"
        truncate={truncate}
        weight="medium"
      >
        {label}
      </Text>
    </Flex>
  )
}

export default TransactionMetaItem
