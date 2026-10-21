// SPDX-License-Identifier: 0BSD
import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { Button } from '@/components/inputs'
import { Flex, type FlexProps, Icon, Text } from '@/components/primitives'

type EmptyMessage =
  | { title: string; description?: ReactNode }
  | { id: string; namespace?: string | false; tKey?: string }
export function EmptyStateScreen({
  message,
  icon,
  smaller,
  CTAButtonProps,
  ...layout
}: FlexProps & {
  message: EmptyMessage
  icon?: string | ReactElement
  smaller?: boolean
  CTAButtonProps?: ComponentProps<typeof Button>
}) {
  const namespace = 'id' in message ? message.namespace : false
  const { t } = useModuleTranslation(namespace ? [namespace] : undefined)
  const translationKey =
    'id' in message
      ? [message.tKey, 'empty', message.id].filter(Boolean).join('.')
      : ''
  const title =
    'title' in message
      ? message.title
      : namespace === false
        ? message.id
        : t(translationKey + '.title')
  const description =
    'title' in message
      ? message.description
      : namespace === false
        ? undefined
        : t(translationKey + '.description')
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={smaller ? 'sm' : 'lg'}
      p="lg"
      width="100%"
      height="100%"
      {...layout}
    >
      {typeof icon === 'string' ? (
        <Icon icon={icon} color="muted" size={smaller ? '3rem' : '5rem'} />
      ) : (
        icon
      )}
      <Text
        as="h2"
        align="center"
        weight="semibold"
        size={smaller ? 'lg' : '2xl'}
      >
        {title}
      </Text>
      {description && (
        <Text as="div" align="center" color="muted" whiteSpace="pre-wrap">
          {description}
        </Text>
      )}
      {CTAButtonProps && <Button {...CTAButtonProps} />}
    </Flex>
  )
}
