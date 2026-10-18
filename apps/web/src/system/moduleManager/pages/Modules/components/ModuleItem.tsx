import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Module } from '@monolith/configs'
import { Box, Button, Flex, Icon, Stack, Switch, Text } from '@monolith/ui'

import { addonSlug } from '../filters'

export default function ModuleItem({
  module,
  title,
  description,
  category,
  enabled,
  pending,
  disabled,
  workspace,
  onToggle
}: {
  module: Module
  title: string
  description: string
  category: string
  enabled: boolean
  pending: boolean
  disabled: boolean
  workspace?: string
  onToggle: () => void
}) {
  const { t } = useTranslation('common.module-manager'),
    { t: ui } = useTranslation('common.workspaceUI')
  const kind = module.experience?.kind ?? 'standard'
  const widget = kind === 'widget'
  return (
    <Stack
      as="article"
      className="addon-card"
      data-addon={addonSlug(module.name)}
      data-enabled={enabled}
      aria-busy={pending}
      p="lg"
      gap="md"
      minWidth="0"
    >
      <Flex align="center" justify="between" gap="sm">
        <Flex
          className="addon-icon"
          centered
          width="2.5rem"
          height="2.5rem"
          r="md"
        >
          <Icon icon={module.icon} size="1.35rem" />
        </Flex>
        <Flex className="addon-toggle" align="center" gap="sm">
          <Text size="xs" color="muted" role="status">
            {t(
              pending
                ? 'catalog.saving'
                : enabled
                  ? 'catalog.on'
                  : 'catalog.off'
            )}
          </Text>
          <Switch
            value={enabled}
            disabled={disabled}
            onChange={onToggle}
            aria-label={t('catalog.toggle', { name: title })}
          />
        </Flex>
      </Flex>
      <Stack gap="sm">
        <Text as="h2" size="lg" weight="semibold">
          {title}
        </Text>
        <Text as="p" color="muted" size="sm" leading="relaxed">
          {description}
        </Text>
      </Stack>
      <Flex align="center" wrap="wrap" gap="xs">
        <Text className="addon-tag" size="xs">
          {ui('addonKinds.' + kind)}
        </Text>
        <Text color="muted" size="xs">
          {category}
        </Text>
      </Flex>
      <Flex
        className="addon-card-footer"
        align="center"
        justify="between"
        gap="sm"
      >
        <Text size="xs" color="muted">
          v{module.version}
        </Text>
        {enabled ? (
          <Button
            as={Link}
            to={
              '/' +
              (widget ? 'dashboard' : addonSlug(module.name)) +
              '?workspace=' +
              (workspace ?? '')
            }
            namespace={false}
            variant="plain"
            icon="lucide:arrow-up-right"
          >
            {t(widget ? 'catalog.openDashboard' : 'catalog.open')}
          </Button>
        ) : (
          <Text size="xs" color="muted">
            {t('catalog.availableHint')}
          </Text>
        )}
      </Flex>
      {widget && enabled && (
        <Box>
          <Text size="xs" color="muted">
            {ui('widgetAddonHelp')}
          </Text>
        </Box>
      )}
    </Stack>
  )
}
