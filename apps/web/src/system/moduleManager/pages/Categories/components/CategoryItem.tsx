import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'

import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import type { Category } from '../model'

export default function CategoryItem({
  item,
  busy,
  first,
  last,
  onMove,
  onEdit,
  onDelete
}: {
  item: Category
  busy: boolean
  first: boolean
  last: boolean
  onMove(direction: -1 | 1): void
  onEdit(): void
  onDelete(): void
}) {
  const { t } = useTranslation('common.module-manager')
  const drag = useSortable({ id: item.key, disabled: busy })

  return (
    <Card
      ref={drag.setNodeRef}
      align="center"
      direction="row"
      gap="sm"
      p="sm"
      style={{
        transform: CSS.Transform.toString(drag.transform),
        transition: drag.transition,
        opacity: drag.isDragging ? 0.55 : 1
      }}
    >
      <Button
        {...drag.attributes}
        {...drag.listeners}
        aria-label={t('shop.moveArea', { name: item.key })}
        disabled={busy}
        icon="tabler:grip-vertical"
        style={{ touchAction: 'none' }}
        variant="plain"
      />
      <Stack flex="1" gap="xs" minWidth="0">
        <Text as="code" size="sm" weight="medium">
          {item.key}
        </Text>
        <Flex gap="sm" wrap="wrap">
          {Object.entries(item.value).map(([language, label]) => (
            <Text key={language} color="muted" size="xs">
              <Text weight="medium">{language}</Text> · {label}
            </Text>
          ))}
        </Flex>
      </Stack>
      <Flex gap="xs" wrap="wrap">
        <Button
          aria-label={t('shop.moveUp', { name: item.key })}
          disabled={busy || first}
          icon="tabler:arrow-up"
          variant="plain"
          onClick={() => onMove(-1)}
        />
        <Button
          aria-label={t('shop.moveDown', { name: item.key })}
          disabled={busy || last}
          icon="tabler:arrow-down"
          variant="plain"
          onClick={() => onMove(1)}
        />
        <Button
          aria-label={t('categoryEditor.edit', { name: item.key })}
          disabled={busy}
          icon="tabler:pencil"
          variant="plain"
          onClick={onEdit}
        />
        <Button
          dangerous
          aria-label={t('categoryEditor.remove', { name: item.key })}
          disabled={busy}
          icon="tabler:trash"
          variant="plain"
          onClick={onDelete}
        />
      </Flex>
    </Card>
  )
}
