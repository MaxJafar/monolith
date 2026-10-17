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
      direction="row"
      align="center"
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
        variant="plain"
        icon="tabler:grip-vertical"
        disabled={busy}
        aria-label={t('shop.moveArea', { name: item.key })}
        style={{ touchAction: 'none' }}
      />
      <Stack gap="xs" flex="1" minWidth="0">
        <Text as="code" size="sm" weight="medium">
          {item.key}
        </Text>
        <Flex gap="sm" wrap="wrap">
          {Object.entries(item.value).map(([language, label]) => (
            <Text key={language} size="xs" color="muted">
              <Text weight="medium">{language}</Text> · {label}
            </Text>
          ))}
        </Flex>
      </Stack>
      <Flex gap="xs" wrap="wrap">
        <Button
          variant="plain"
          icon="tabler:arrow-up"
          disabled={busy || first}
          onClick={() => onMove(-1)}
          aria-label={t('shop.moveUp', { name: item.key })}
        />
        <Button
          variant="plain"
          icon="tabler:arrow-down"
          disabled={busy || last}
          onClick={() => onMove(1)}
          aria-label={t('shop.moveDown', { name: item.key })}
        />
        <Button
          variant="plain"
          icon="tabler:pencil"
          disabled={busy}
          onClick={onEdit}
          aria-label={t('categoryEditor.edit', { name: item.key })}
        />
        <Button
          variant="plain"
          dangerous
          icon="tabler:trash"
          disabled={busy}
          onClick={onDelete}
          aria-label={t('categoryEditor.remove', { name: item.key })}
        />
      </Flex>
    </Card>
  )
}
