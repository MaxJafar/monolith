// SPDX-License-Identifier: 0BSD
import type { ReactElement, ReactNode } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Button } from '@/components/inputs/Button'
import { Flex, Icon, Text } from '@/components/primitives'

function titleCandidates(title: string): string[] {
  const words = title
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const camel = words
    .map((word, index) =>
      index
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join('')
  return [
    ...new Set([
      title,
      title + '.title',
      'modals.' + title + '.title',
      'modals.' + title,
      camel,
      camel + '.title',
      'modals.' + camel + '.title',
      'modals.' + camel
    ])
  ]
}
export function ModalHeader({
  title,
  icon,
  onClose,
  namespace = 'common.modals',
  subtitle,
  appendTitle,
  trailing,
  titleId,
  className = ''
}: {
  title: ReactNode
  icon: string
  onClose: () => void
  namespace?: string | false
  subtitle?: ReactNode
  appendTitle?: ReactElement
  trailing?: ReactNode
  titleId?: string
  className?: string
}) {
  const { t } = useModuleTranslation(
    namespace
      ? [namespace, 'common.modals', 'common.buttons']
      : ['common.buttons']
  )
  const caption =
    typeof title === 'string' && namespace !== false
      ? t(titleCandidates(title), { defaultValue: title })
      : title
  return (
    <Flex
      className={['monolith-modal-heading', className]
        .filter(Boolean)
        .join(' ')}
      align="start"
      justify="between"
      gap="md"
      mb="md"
    >
      <Flex align="start" gap="sm" minWidth="0" flex="1">
        <Icon
          icon={icon}
          color="muted"
          size="20px"
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <Flex direction="column" gap="xs" minWidth="0" flex="1">
          <Flex as="h1" id={titleId} align="center" gap="sm" minWidth="0">
            <Text as="span" size="lg" weight="semibold" truncate>
              {caption}
            </Text>
            {appendTitle}
          </Flex>
          {subtitle && (
            <Text size="sm" color="muted">
              {subtitle}
            </Text>
          )}
        </Flex>
      </Flex>
      <Flex align="center" gap="xs" flexShrink="0">
        {trailing}
        <Button
          variant="plain"
          icon="tabler:x"
          aria-label={t('common.buttons:close', { defaultValue: 'Close' })}
          p="xs"
          onClick={onClose}
        />
      </Flex>
    </Flex>
  )
}
