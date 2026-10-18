import { useModuleTranslation } from '@monolith/localization'
import { Box, Flex, Text, colorWithOpacity } from '@monolith/ui'

function StatementEndedText() {
  const { t } = useModuleTranslation()

  return (
    <Flex align="center" gap="md" my="xl">
      <Box
        bg={{ base: 'bg-800', print: colorWithOpacity('bg-500', '5%') }}
        height="3px"
        width="100%"
      />
      <Text
        size="xl"
        tracking="widest"
        transform="uppercase"
        weight="semibold"
        whiteSpace="nowrap"
      >
        {t('statement.endOfStatements')}
      </Text>
      <Box
        bg={{ base: 'bg-800', print: colorWithOpacity('bg-500', '5%') }}
        height="3px"
        width="100%"
      />
    </Flex>
  )
}

export default StatementEndedText
