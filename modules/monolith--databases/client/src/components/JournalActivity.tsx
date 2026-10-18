import { Box, Flex, Stack, Text } from '@monolith/ui'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import type { RecordPage } from '../../../shared'

export function JournalActivity({ records }: { records: RecordPage[] }) {
  const { t } = useTranslation('common.workspaceUI')

  const days = new Map<string, number>()

  for (const record of records) {
    if (!record.date || !dayjs(record.date).isValid()) continue

    const date = dayjs(record.date).format('YYYY-MM-DD')
    days.set(date, (days.get(date) ?? 0) + 1)
  }

  const month = dayjs().format('YYYY-MM')

  return (
    <Flex
      align="center"
      className="monolith-journal-activity"
      gap="lg"
      p="lg"
      wrap="wrap"
    >
      {[
        ['journalEntries', records.length],
        ['journalDays', days.size],
        [
          'journalMonth',
          [...days]
            .filter(([date]) => date.startsWith(month))
            .reduce((sum, [, count]) => sum + count, 0)
        ]
      ].map(([key, count]) => (
        <Stack key={key} gap="xs" width="auto">
          <Text size="2xl" weight="semibold">
            {count}
          </Text>
          <Text color="muted" size="xs">
            {t(String(key))}
          </Text>
        </Stack>
      ))}
      <Stack flex="1" gap="sm" minWidth="180px">
        <Text color="muted" size="xs">
          {t('journalActivity')}
        </Text>
        <Flex className="monolith-journal-days" gap="xs" wrap="wrap">
          {Array.from({ length: 28 }, (_, index) => {
            const date = dayjs()
                .subtract(27 - index, 'day')
                .format('YYYY-MM-DD'),
              count = days.get(date) ?? 0

            return (
              <Box
                key={date}
                aria-label={t('journalDay', { date, count })}
                data-active={count > 0}
                role="img"
                title={t('journalDay', { date, count })}
              />
            )
          })}
        </Flex>
      </Stack>
    </Flex>
  )
}
