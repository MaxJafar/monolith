import { useTranslation } from 'react-i18next'

import { Flex, Grid, Icon, Stack, Text, useCanvasWidgets } from '@monolith/ui'

import WidgetPicker from './WidgetPicker'

export default function WidgetCatalog({
  search,
  sidebar = false
}: {
  search: string
  sidebar?: boolean
}) {
  const { widgets } = useCanvasWidgets(),
    { t, i18n } = useTranslation('common.module-manager')
  const entries = Object.entries(widgets).filter(
    ([id, widget]) =>
      id !== 'linkedDatabase' &&
      id !== 'rpgProfile' &&
      (sidebar || widget.module === 'core') &&
      `${widget.title} ${id}`.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <Grid templateCols={{ base: 1, md: 2, xl: 3 }} gap="md">
      {entries.map(([id, widget]) => (
        <Stack
          key={id}
          as="article"
          data-widget={id}
          className="addon-card"
          p="lg"
          gap="md"
        >
          <Flex align="center" gap="sm">
            <Icon icon={widget.icon} size="1.4em" />
            <Text as="h3" weight="semibold">
              {widget.title}
            </Text>
          </Flex>
          <Text size="sm" color="muted">
            {i18n.exists(`shop.widgetDescriptions.${id}`, {
              ns: 'common.module-manager'
            })
              ? t(`shop.widgetDescriptions.${id}`)
              : t('shop.connectedWidget')}
          </Text>
          <Text size="xs" color="muted">
            {t(widget.module === 'core' ? 'shop.builtIn' : 'shop.installed')}
          </Text>
          <WidgetPicker widgetId={id} sidebar={sidebar} />
        </Stack>
      ))}
    </Grid>
  )
}
