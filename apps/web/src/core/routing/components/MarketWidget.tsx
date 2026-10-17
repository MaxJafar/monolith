import { useAuth } from '@monolith/api'
import {
  Button,
  type CanvasWidgetConfiguration,
  Flex,
  Stack,
  Text
} from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import { widgetConfig } from '../../../../../../modules/monolith--databases/widgetShared'

export function MarketWidget({
  workspaceId,
  configuration
}: {
  workspaceId: string
  configuration?: CanvasWidgetConfiguration
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'widgetSettings' }),
    { userData } = useAuth(),
    config = widgetConfig(configuration?.filter)
  const options = workspaceAPI.workspaceWidgets.quotes
    .input({
      workspace_id: workspaceId || '00000000-0000-4000-8000-000000000000',
      stocks: config.stocks ?? '',
      coins: config.coins ?? 'bitcoin,ethereum'
    })
    .queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!workspaceId,
    staleTime: 60000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    retry: 1
  })
  return (
    <Stack gap="sm">
      <Flex align="center" justify="between">
        <Text size="xs" color="muted">
          USD · {t('autoRefresh')}
        </Text>
        <Button
          namespace={false}
          variant="plain"
          p="xs"
          icon="lucide:refresh-cw"
          aria-label={t('refresh')}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </Flex>
      {query.isPending && (
        <Text role="status" size="xs">
          {t('loading')}
        </Text>
      )}
      {query.isError && (
        <Text role="alert" size="xs">
          {t('quotesUnavailable')}
        </Text>
      )}
      {query.data?.map(quote => (
        <Stack
          key={`${quote.source}:${quote.symbol}`}
          gap="xs"
          className="workspace-widget-quote"
          py="xs"
        >
          <Flex justify="between" gap="sm">
            <Text truncate size="xs" weight="medium">
              {quote.symbol.toUpperCase()}
            </Text>
            <Text size="xs">
              {quote.price === null
                ? '—'
                : new Intl.NumberFormat(i18n.language, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: quote.price < 1 ? 6 : 2
                  }).format(quote.price)}
            </Text>
          </Flex>
          <Flex justify="between" gap="sm">
            <Text size="xs" color="muted">
              {quote.at
                ? new Date(quote.at * 1000).toLocaleString(i18n.language, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : quote.source}
            </Text>
            {quote.change !== null && (
              <Text
                size="xs"
                color={quote.change < 0 ? 'red-500' : 'green-600'}
              >
                {quote.change >= 0 ? '+' : ''}
                {quote.change.toFixed(2)}%
              </Text>
            )}
          </Flex>
          {quote.error && (
            <Text size="xs" color="muted">
              {t(quote.error)}
            </Text>
          )}
        </Stack>
      ))}
      {query.data?.some(q => q.error?.endsWith('Key')) && (
        <Button
          as={Link}
          to="/api-keys"
          namespace={false}
          variant="plain"
          icon="lucide:key-round"
          justify="start"
        >
          {t('connectMarket')}
        </Button>
      )}
      <Text size="xs" color="muted">
        {t('quoteHelp')}
      </Text>
      <Flex gap="sm">
        <Text
          as="a"
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noreferrer"
          size="xs"
          color="muted"
        >
          CoinGecko
        </Text>
        <Text
          as="a"
          href="https://finnhub.io/"
          target="_blank"
          rel="noreferrer"
          size="xs"
          color="muted"
        >
          Finnhub
        </Text>
      </Flex>
    </Stack>
  )
}
