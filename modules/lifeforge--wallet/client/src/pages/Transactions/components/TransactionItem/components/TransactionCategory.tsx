import { Box, Icon } from '@lifeforge/ui'

function TransactionCategory({ color, icon }: { color: string; icon: string }) {
  return (
    <>
      <Box
        display={{ base: 'block', sm: 'none' }}
        height="3rem"
        r="full"
        style={{
          backgroundColor: color
        }}
        width="0.25rem"
      />
      <Box
        display={{ base: 'none', sm: 'block' }}
        p="md"
        r="md"
        style={{
          backgroundColor: `${color}20`,
          color
        }}
      >
        <Icon icon={icon} size="1.5rem" />
      </Box>
    </>
  )
}

export default TransactionCategory
