// SPDX-License-Identifier: 0BSD
import { type ReactElement, isValidElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/inputs'
import { Flex, Text } from '@/components/primitives'

import { useSidebarLabel } from '../shared'

export function SidebarTitle({
  label,
  namespace,
  className,
  actionButton
}: {
  label: string
  namespace?: string | false
  className?: string
  actionButton?: ReactElement | { icon: string; onClick: () => void }
}) {
  const translate = useSidebarLabel(namespace)
  const { t } = useTranslation('common.sidebar')
  const title = translate(label, 'title')
  return (
    <Flex as="li" align="center" justify="between" gap="sm" px="md" py="sm">
      <Text
        as="h3"
        className={className}
        size="sm"
        weight="medium"
        color="muted"
      >
        {title}
      </Text>
      {actionButton &&
        (isValidElement(actionButton) ? (
          actionButton
        ) : (
          <Button
            variant="plain"
            p="xs"
            icon={actionButton.icon}
            onClick={actionButton.onClick}
            aria-label={t('itemAction', {
              name: typeof title === 'string' ? title : label
            })}
          />
        ))}
    </Flex>
  )
}
