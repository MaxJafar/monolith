import { useModuleTranslation } from '@lifeforge/localization'
import {
  Flex,
  type FlexProps,
  Listbox,
  ListboxOption,
  Text
} from '@lifeforge/ui'

function IntervalSelector<T extends string>({
  options,
  lastFor,
  setLastFor,
  ...rest
}: {
  options: T[]
  lastFor: T
  setLastFor: (value: T) => void
} & FlexProps) {
  const { t } = useModuleTranslation()

  return (
    <Flex align="center" flexShrink="0" gap="sm" {...rest}>
      <Text
        color="muted"
        display={{ base: 'none', md: 'block' }}
        size="sm"
        tracking="wide"
        weight="medium"
      >
        {t('labels.inThePast')}
      </Text>
      <Listbox
        renderContent={() => (
          <span>{`${lastFor.split(' ')[0]} ${t(`units.${lastFor.split(' ')[1]?.toLowerCase() ?? 'hours'}`)}`}</span>
        )}
        value={lastFor}
        width={{ base: '100%', md: '12rem' }}
        onChange={setLastFor}
      >
        {options.map((last, index) => (
          <ListboxOption
            key={index}
            icon="tabler:clock"
            label={`${last.split(' ')[0]} ${t(`units.${last.split(' ')[1]?.toLowerCase() ?? 'hours'}`)}`}
            value={last}
          />
        ))}
      </Listbox>
    </Flex>
  )
}

export default IntervalSelector
