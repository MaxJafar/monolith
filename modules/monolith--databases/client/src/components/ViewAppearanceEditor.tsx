import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Icon,
  IconPalette,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { viewIcons } from '@/utils/viewLayouts'

import {
  type SavedView,
  type ViewConfig,
  viewConfigSchema
} from '../../../shared'
import { useViewAutosave } from './useViewAutosave'

export function ViewAppearanceFields({
  name,
  mode,
  tab,
  onNameChange,
  onChange
}: {
  name: string
  mode: SavedView['mode']
  tab: ViewConfig['tab']
  onNameChange: (name: string) => void
  onChange: (tab: ViewConfig['tab']) => void
}) {
  const { t } = useModuleTranslation()
  const { t: ui } = useTranslation('common.workspaceUI')
  const [icons, setIcons] = useState(false)
  return (
    <Stack gap="sm">
      <Flex gap="xs" align="center">
        <Button
          namespace={false}
          variant="plain"
          p="xs"
          aria-label={ui('groupIcon')}
          aria-expanded={icons}
          onClick={() => setIcons(!icons)}
        >
          <Icon
            icon={tab?.icon || viewIcons[mode]}
            size="18px"
            preserveStyle
            style={{ color: tab?.icon_color || 'var(--text-muted)' }}
          />
        </Button>
        <Box
          as="input"
          autoFocus
          className="database-view-name"
          aria-label={t('inputs.viewName')}
          maxLength={255}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          style={{ color: tab?.text_color || 'var(--text-primary)' }}
        />
      </Flex>
      {icons && (
        <IconPalette
          icon={tab?.icon || viewIcons[mode]}
          color={tab?.icon_color || ''}
          onIconChange={icon => onChange({ ...tab, icon })}
          onColorChange={color =>
            onChange({ ...tab, icon_color: color || undefined })
          }
        />
      )}
      <Flex
        justify="between"
        align="center"
        className="database-compact-setting"
      >
        <Text size="sm">{ui('textColor')}</Text>
        <Flex gap="xs" align="center">
          {tab?.text_color && (
            <Button
              namespace={false}
              variant="plain"
              p="xs"
              aria-label={ui('resetTextColor')}
              icon="lucide:rotate-ccw"
              onClick={() => onChange({ ...tab, text_color: undefined })}
            />
          )}
          <Box
            as="input"
            type="color"
            className="database-color-swatch"
            aria-label={ui('textColor')}
            value={tab?.text_color || '#73736f'}
            onChange={e => onChange({ ...tab, text_color: e.target.value })}
          />
        </Flex>
      </Flex>
      <ChoiceSelect
        label={t('viewDisplay')}
        value={tab?.display || 'both'}
        options={['both', 'text', 'icon'].map(value => ({
          value,
          label: t(`viewDisplayOptions.${value}`)
        }))}
        onChange={display =>
          onChange({ ...tab, display: display as 'both' | 'text' | 'icon' })
        }
      />
    </Stack>
  )
}

export function ViewAppearanceEditor({ view }: { view: SavedView }) {
  const { t } = useModuleTranslation()
  const [name, setName] = useState(view.name)
  const [config, setConfig] = useState(viewConfigSchema.parse(view.config))
  const save = useViewAutosave(
    view,
    { name, mode: view.mode, group_field_id: view.group_field_id, config },
    !!name.trim()
  )
  return (
    <Stack gap="sm" className="database-tab-editor">
      <ViewAppearanceFields
        name={name}
        mode={view.mode}
        tab={config.tab}
        onNameChange={setName}
        onChange={tab => setConfig(current => ({ ...current, tab }))}
      />
      {save.failed && (
        <Button namespace={false} variant="plain" onClick={save.retry}>
          {t('retrySave')}
        </Button>
      )}
      <Text size="xs" color="muted" role="status">
        {t(save.pending ? 'savingPage' : 'viewAutosave')}
      </Text>
    </Stack>
  )
}
