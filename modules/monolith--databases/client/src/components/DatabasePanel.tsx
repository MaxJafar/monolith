import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, FloatingPopover, Text } from '@monolith/ui'
import { type ReactNode, useMemo } from 'react'

export function DatabasePanel({
  title,
  onClose,
  children,
  anchor,
  width = 360
}: {
  title: string
  onClose: () => void
  children: ReactNode
  anchor?: Pick<Element, 'getBoundingClientRect'> | null
  width?: number
}) {
  const { t } = useModuleTranslation()
  const fallback = useMemo(
    () => ({
      getBoundingClientRect: () => new DOMRect(window.innerWidth - 24, 80, 0, 0)
    }),
    []
  )
  return (
    <FloatingPopover
      anchor={anchor ?? fallback}
      label={title}
      onClose={onClose}
      width={width}
      align="end"
      className="database-floating-panel"
    >
      <Flex
        justify="between"
        align="center"
        className="database-popover-heading"
        pb="sm"
      >
        <Text size="sm" weight="semibold">
          {title}
        </Text>
        <Button
          namespace={false}
          variant="plain"
          aria-label={t('buttons.cancel')}
          icon="lucide:x"
          p="xs"
          onClick={onClose}
        />
      </Flex>
      {children}
    </FloatingPopover>
  )
}
