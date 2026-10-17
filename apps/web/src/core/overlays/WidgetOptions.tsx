import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, Button, ChoiceSelect, Stack, Text } from '@monolith/ui'

import { widgetConfig } from '../../../../../modules/monolith--databases/widgetShared'

export default function WidgetOptions({
  id,
  filter,
  onChange
}: {
  id: string
  filter: string
  onChange: (filter: string) => void
}) {
  const { t } = useTranslation('common', { keyPrefix: 'widgetSettings' }),
    config = widgetConfig(filter),
    [stocks, setStocks] = useState(config.stocks ?? ''),
    [coins, setCoins] = useState(config.coins ?? 'bitcoin,ethereum')
  if (id === 'calendarWidget')
    return (
      <ChoiceSelect
        label={t('calendarView')}
        value={config.mode ?? 'month'}
        options={['week', 'month', 'agenda'].map(value => ({
          value,
          label: t(value)
        }))}
        onChange={mode => onChange(JSON.stringify({ ...config, mode }))}
      />
    )
  if (id === 'marketTracker')
    return (
      <Stack
        as="form"
        gap="sm"
        onSubmit={e => {
          e.preventDefault()
          onChange(JSON.stringify({ stocks, coins }))
        }}
      >
        <Stack as="label" gap="xs">
          <Text size="xs" color="muted">
            {t('stockSymbols')}
          </Text>
          <Box
            as="input"
            className="workspace-input"
            maxLength={120}
            pattern="[A-Za-z0-9.,: -]*"
            value={stocks}
            placeholder="AAPL, MSFT"
            onChange={e => setStocks(e.target.value)}
          />
        </Stack>
        <Stack as="label" gap="xs">
          <Text size="xs" color="muted">
            {t('coinIds')}
          </Text>
          <Box
            as="input"
            className="workspace-input"
            maxLength={200}
            pattern="[a-z0-9, -]*"
            value={coins}
            placeholder="bitcoin, ethereum"
            onChange={e => setCoins(e.target.value)}
          />
        </Stack>
        <Text size="xs" color="muted">
          {t('marketHelp')}
        </Text>
        <Button
          namespace={false}
          type="submit"
          variant="secondary"
          width="fit-content"
        >
          {t('save')}
        </Button>
      </Stack>
    )
  return null
}
