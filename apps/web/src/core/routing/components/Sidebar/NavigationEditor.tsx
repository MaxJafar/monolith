import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Icon,
  IconPalette,
  Stack,
  Text
} from '@monolith/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function NavigationEditor({
  anchor,
  initial,
  initialIcon = 'lucide:folder',
  initialColor = '',
  label,
  onSave,
  onClose
}: {
  anchor: HTMLElement | null
  initial: string
  initialIcon?: string
  initialColor?: string
  label: string
  onSave: (name: string, icon?: string, color?: string) => Promise<boolean>
  onClose: () => void
}) {
  const { t } = useTranslation('common.navigation')
  const [name, setName] = useState(initial)
  const [icon, setIcon] = useState(initialIcon)
  const [color, setColor] = useState(initialColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  return (
    <FloatingPopover
      anchor={anchor}
      label={label}
      onClose={onClose}
      side="right"
      width={344}
    >
      <Stack
        as="form"
        gap="sm"
        onSubmit={async event => {
          event.preventDefault()
          if (!name.trim() || saving) return
          setSaving(true)
          try {
            if (await onSave(name.trim(), icon, color)) onClose()
          } catch (cause) {
            setError(String(cause))
          } finally {
            setSaving(false)
          }
        }}
      >
        <Text size="xs" color="muted" px="xs">
          {label}
        </Text>
        <Flex gap="sm" align="center" px="xs">
          <Icon
            preserveStyle
            icon={icon}
            size="24px"
            style={{ color: color || 'var(--text-primary)' }}
          />
          <Box
            as="input"
            autoFocus
            required
            aria-label={label}
            placeholder={label}
            className="monolith-nav-input"
            maxLength={80}
            value={name}
            flex="1"
            minWidth="0"
            onChange={event => setName(event.target.value)}
          />
        </Flex>
        <IconPalette
          icon={icon}
          color={color}
          onIconChange={setIcon}
          onColorChange={setColor}
        />
        {error && (
          <Text size="sm" color="dangerous" role="alert">
            {error}
          </Text>
        )}
        <Flex gap="xs" justify="end" pt="sm">
          <Button
            namespace={false}
            type="button"
            variant="plain"
            onClick={onClose}
          >
            {t('cancel')}
          </Button>
          <Button
            namespace={false}
            type="submit"
            disabled={!name.trim() || saving}
          >
            {t('save')}
          </Button>
        </Flex>
      </Stack>
    </FloatingPopover>
  )
}
