// SPDX-License-Identifier: 0BSD
import { Button } from '@/components/inputs'
import { Flex, type FlexProps, Text } from '@/components/primitives'

import { visiblePages } from './pages'

export function Pagination({
  page,
  totalPages,
  onPageChange,
  ...layout
}: FlexProps<'div'> & {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const count = Number.isFinite(totalPages)
    ? Math.max(0, Math.floor(totalPages))
    : 0
  const current = Number.isFinite(page)
    ? Math.max(1, Math.min(count || 1, Math.floor(page)))
    : 1
  return (
    <Flex
      aria-label="Pagination"
      align="center"
      justify="between"
      gap="sm"
      {...layout}
    >
      <Button
        namespace={false}
        variant="plain"
        icon="tabler:chevron-left"
        aria-label="Previous page"
        disabled={!count || current <= 1}
        onClick={() => onPageChange(Math.max(1, current - 1))}
      />
      <Flex align="center" gap="xs" display={{ base: 'none', lg: 'flex' }}>
        {visiblePages(current, count).map((value, index) =>
          value === 'gap' ? (
            <Text key={'gap-' + index} aria-hidden="true" color="muted">
              …
            </Text>
          ) : (
            <Button
              key={value}
              namespace={false}
              variant={value === current ? 'secondary' : 'plain'}
              aria-label={'Page ' + value}
              aria-current={value === current ? 'page' : undefined}
              onClick={() => onPageChange(value)}
            >
              {value}
            </Button>
          )
        )}
      </Flex>
      <Text display={{ base: 'block', lg: 'none' }} color="muted">
        {count ? current : 0} / {count}
      </Text>
      <Button
        namespace={false}
        variant="plain"
        icon="tabler:chevron-right"
        aria-label="Next page"
        disabled={!count || current >= count}
        onClick={() => onPageChange(Math.min(count, current + 1))}
      />
    </Flex>
  )
}
