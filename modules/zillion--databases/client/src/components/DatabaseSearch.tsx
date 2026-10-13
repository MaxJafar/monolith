import { useModuleTranslation } from '@lifeforge/localization'
import { Flex, Icon, TextInput } from '@lifeforge/ui'

export function DatabaseSearch({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useModuleTranslation()

  return (
    <Flex align="center" gap="sm" minWidth="0" width="100%">
      <Icon aria-hidden="true" color="muted" icon="tabler:search" />
      <TextInput
        actionButtonProps={{
          'aria-label': t('buttons.clear'),
          disabled: !value,
          icon: 'tabler:x',
          minHeight: { base: '44px', md: '32px' },
          p: 'xs',
          onClick: () => onChange('')
        }}
        aria-label={t('searchTitles')}
        inputMode="search"
        namespace={false}
        placeholder={t('searchTitles')}
        size="small"
        value={value}
        variant="plain"
        wrapperProps={{
          bg: 'transparent',
          minHeight: { base: '44px', md: '32px' },
          p: 'none',
          role: 'search',
          tabIndex: -1
        }}
        onChange={onChange}
        onKeyDown={event => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            event.stopPropagation()
            onChange('')
          }
        }}
      />
    </Flex>
  )
}
