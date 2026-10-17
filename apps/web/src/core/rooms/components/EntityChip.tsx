import { Button, Flex, Icon, Text } from '@monolith/ui'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Entity } from '../types'

const icons: Record<string, string> = {
  redraw: 'lucide:pen-tool',
  task: 'lucide:circle-check',
  action: 'lucide:circle-check',
  project: 'lucide:layers-2',
  database: 'lucide:database',
  person: 'lucide:at-sign',
  room: 'lucide:hash'
}

export default function EntityChip({
  entity,
  onRemove
}: {
  entity: Entity
  onRemove?: () => void
}) {
  const { t } = useTranslation('common.rooms')

  const content = (
    <>
      <Icon icon={icons[entity.kind] ?? 'lucide:file-text'} size="1rem" />
      <Text truncate size="sm">
        {entity.available ? entity.title : t('itemUnavailable')}
      </Text>
    </>
  )

  return (
    <Flex
      align="center"
      bg={{ base: 'bg-100', dark: 'bg-800' }}
      className="rooms-entity"
      gap="xs"
      maxWidth="100%"
      r="sm"
    >
      {entity.available && entity.href ? (
        <Button
          as={Link}
          gap="xs"
          minWidth="0"
          namespace={false}
          px="sm"
          py="xs"
          to={entity.href}
          variant="plain"
        >
          {content}
        </Button>
      ) : (
        <Flex align="center" gap="xs" minWidth="0" px="sm" py="xs">
          {content}
        </Flex>
      )}
      {onRemove && (
        <Button
          aria-label={t('removeMention', { name: entity.title })}
          icon="lucide:x"
          variant="plain"
          onClick={onRemove}
        />
      )}
    </Flex>
  )
}
