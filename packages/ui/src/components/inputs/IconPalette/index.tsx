import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Flex, Grid, Icon, Stack } from '@/components/primitives'

import './palette.css'

const icons = [
  'lucide:folder',
  'lucide:folder-open',
  'lucide:file-text',
  'lucide:notebook',
  'lucide:book-open',
  'lucide:library',
  'lucide:layers',
  'lucide:archive',
  'lucide:briefcase',
  'lucide:house',
  'lucide:building-2',
  'lucide:graduation-cap',
  'lucide:rocket',
  'lucide:target',
  'lucide:flag',
  'lucide:trophy',
  'lucide:star',
  'lucide:heart',
  'lucide:bookmark',
  'lucide:lightbulb',
  'lucide:palette',
  'lucide:brush',
  'lucide:pen-tool',
  'lucide:scissors',
  'lucide:music',
  'lucide:headphones',
  'lucide:camera',
  'lucide:film',
  'lucide:code',
  'lucide:terminal',
  'lucide:database',
  'lucide:table-2',
  'lucide:calendar',
  'lucide:clock',
  'lucide:list-checks',
  'lucide:check-circle-2',
  'lucide:users',
  'lucide:message-circle',
  'lucide:mail',
  'lucide:globe',
  'lucide:map',
  'lucide:compass',
  'lucide:plane',
  'lucide:mountain',
  'lucide:coffee',
  'lucide:leaf',
  'lucide:sun',
  'lucide:moon',
  'lucide:flask-conical',
  'lucide:brain',
  'lucide:dumbbell',
  'lucide:gamepad-2',
  'lucide:wallet',
  'lucide:shopping-bag',
  'lucide:gem',
  'lucide:puzzle'
]
const colors = [
  '',
  '#939390',
  '#cb7351',
  '#df9c45',
  '#d5b64b',
  '#4caa78',
  '#438ce1',
  '#a17bd8',
  '#d06ea4',
  '#de6262'
]
const names = [
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red'
]

/** Compact icon and color choices for page chrome and navigation popovers. */
export function IconPalette({
  icon,
  color,
  onIconChange,
  onColorChange
}: {
  icon: string
  color: string
  onIconChange: (value: string) => void
  onColorChange: (value: string) => void
}) {
  const { t } = useTranslation('common.workspaceUI')
  const [query, setQuery] = useState('')
  const label = useId()
  const choices = icons.filter(value =>
    value
      .replace('lucide:', '')
      .replaceAll('-', ' ')
      .includes(query.trim().toLowerCase())
  )
  return (
    <Stack gap="sm" className="monolith-icon-palette">
      <Flex gap="sm" align="center">
        <Icon icon="lucide:search" size="16px" />
        <Box
          as="input"
          type="search"
          aria-label={t('searchIcons')}
          placeholder={t('searchIcons')}
          value={query}
          onChange={event => setQuery(event.target.value)}
          flex="1"
          minWidth="0"
          p="sm"
          r="sm"
        />
      </Flex>
      <Flex gap="xs" wrap="wrap" role="group" aria-label={t('iconColor')}>
        {colors.map((value, index) => (
          <Box
            as="button"
            type="button"
            key={names[index]}
            aria-label={t(`palette.${names[index]}`)}
            title={t(`palette.${names[index]}`)}
            aria-pressed={color === value}
            className="monolith-color-swatch"
            onClick={() => onColorChange(value)}
            style={
              {
                '--swatch': value || 'var(--text-primary)'
              } as React.CSSProperties
            }
          />
        ))}
        <Box
          as="label"
          className="monolith-custom-color"
          title={t('customColor')}
        >
          <Icon icon="lucide:pipette" size="15px" />
          <Box
            as="input"
            type="color"
            aria-label={t('customColor')}
            value={/^#[a-f\d]{6}$/i.test(color) ? color : '#438ce1'}
            onChange={event => onColorChange(event.target.value)}
          />
        </Box>
      </Flex>
      <Grid
        id={label}
        role="group"
        aria-label={t('groupIcon')}
        templateCols={8}
        gap="xs"
        maxHeight="224px"
        overflow="auto"
        onKeyDown={event => {
          const delta = {
            ArrowRight: 1,
            ArrowLeft: -1,
            ArrowDown: 8,
            ArrowUp: -8
          }[event.key]
          if (delta === undefined) return
          const buttons = Array.from(
            event.currentTarget.querySelectorAll('button')
          )
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement
          )
          if (index < 0) return
          event.preventDefault()
          buttons[
            Math.max(0, Math.min(buttons.length - 1, index + delta))
          ]?.focus()
        }}
      >
        {choices.map(value => (
          <Box
            as="button"
            type="button"
            key={value}
            p="sm"
            r="sm"
            className="monolith-icon-choice"
            aria-label={value.slice(7).replaceAll('-', ' ')}
            title={value.slice(7).replaceAll('-', ' ')}
            aria-pressed={icon === value}
            onClick={() => onIconChange(value)}
          >
            <Icon
              preserveStyle
              icon={value}
              size="19px"
              style={{ color: color || 'var(--text-primary)' }}
            />
          </Box>
        ))}
      </Grid>
      {!choices.length && (
        <Box color="muted" p="sm" role="status">
          {t('noIcons')}
        </Box>
      )}
    </Stack>
  )
}
