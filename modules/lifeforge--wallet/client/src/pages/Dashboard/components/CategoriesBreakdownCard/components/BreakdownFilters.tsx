import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, Listbox, ListboxOption, Text } from '@lifeforge/ui'

function BreakdownFilters({
  selectedType,
  setSelectedType
}: {
  selectedType: 'income' | 'expenses'
  setSelectedType: (type: 'income' | 'expenses') => void
}) {
  const { t } = useModuleTranslation()

  return (
    <Listbox
      renderContent={() => (
        <Flex align="center" gap="md">
          <Icon
            color={selectedType === 'income' ? 'green-500' : 'red-500'}
            icon={
              selectedType === 'income' ? 'tabler:login-2' : 'tabler:logout'
            }
            size="1.5rem"
          />
          <Text>{t(`transactionTypes.${selectedType}`)}</Text>
        </Flex>
      )}
      value={selectedType}
      width="100%"
      onChange={(value: 'income' | 'expenses') => setSelectedType(value)}
    >
      {(['income', 'expenses'] as const).map(type => (
        <ListboxOption
          key={type}
          icon={type === 'income' ? 'tabler:login-2' : 'tabler:logout'}
          label={t(`transactionTypes.${type}`)}
          value={type}
        />
      ))}
    </Listbox>
  )
}

export default BreakdownFilters
