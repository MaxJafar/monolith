import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { Box, Button, Flex, Text } from '@monolith/ui'

import { calendarDays, shiftCalendarMonth } from '@/utils/calendar'

export function CalendarMiniMonth({
  date,
  onChange
}: {
  date: string
  onChange: (date: string) => void
}) {
  const { t, i18n } = useTranslation('common.workHub')

  const days = calendarDays(date, 'month')

  return (
    <Box className="calendar-mini">
      <Flex align="center" justify="between">
        <Text size="sm" weight="semibold">
          {dayjs(date).locale(i18n.language).format('MMMM YYYY')}
        </Text>
        <Flex>
          <Button
            aria-label={t('previous')}
            icon="lucide:chevron-left"
            namespace={false}
            variant="plain"
            onClick={() => onChange(shiftCalendarMonth(date, -1))}
          />
          <Button
            aria-label={t('next')}
            icon="lucide:chevron-right"
            namespace={false}
            variant="plain"
            onClick={() => onChange(shiftCalendarMonth(date, 1))}
          />
        </Flex>
      </Flex>
      <Box className="calendar-mini-grid">
        {days.slice(0, 7).map(day => (
          <Text key={day} align="center" color="muted" size="xs">
            {dayjs(day).locale(i18n.language).format('dd')}
          </Text>
        ))}
        {days.map(day => (
          <Box
            key={day}
            aria-label={dayjs(day).format('dddd, MMMM D, YYYY')}
            aria-pressed={day === date}
            as="button"
            data-other={dayjs(day).month() !== dayjs(date).month()}
            data-today={day === dayjs().format('YYYY-MM-DD')}
            type="button"
            onClick={() => onChange(day)}
          >
            {dayjs(day).date()}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
