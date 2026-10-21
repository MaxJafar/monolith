// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import { useModuleMetadata } from '@monolith/federation'
import { useModuleTranslation } from '@monolith/localization'

import { Flex, Icon, Stack, Text } from '@/components/primitives'
import { useAppearance } from '@/providers/AppearanceProvider'
import { colorWithOpacity } from '@/system'

export interface ModuleHeaderProps {
  icon?: string
  title?: string
  trailing?: ReactNode
  namespace?: string | false
}
function candidates(
  label: string,
  field: string,
  namespace: string | false | undefined
) {
  const words =
    label.replace(/([a-z0-9])([A-Z])/g, '$1 $2').match(/[\p{L}\p{N}]+/gu) ?? []
  const camel = words
    .map((word, index) =>
      index
        ? word[0].toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join('')
  const names = [...new Set([camel, label])]
  const keys: string[] = []
  for (const prefix of ['subsections.', '']) {
    const relative = names.map(name => prefix + name + '.' + field)
    keys.push(...relative)
    if (namespace) keys.push(...relative.map(key => namespace + ':' + key))
  }
  if (namespace) keys.push(namespace + ':' + field)
  return keys.concat(field)
}
export function ModuleHeader(props: ModuleHeaderProps) {
  const module = useModuleMetadata()
  const { appearance } = useAppearance()
  const { t } = useModuleTranslation(
    typeof props.namespace === 'string'
      ? [props.namespace, 'common.sidebar']
      : ['common.sidebar']
  )
  const title = props.title ?? module.title
  const heading =
    props.namespace === false
      ? title
      : t(candidates(title, 'title', props.namespace), { defaultValue: title })
  const description =
    props.namespace === false
      ? ''
      : t(candidates(title, 'description', props.namespace), {
          defaultValue: ''
        })
  return (
    <Flex
      as="header"
      data-module-header
      align={{ base: 'start', sm: 'center' }}
      direction={{ base: 'column', sm: 'row' }}
      justify="between"
      gap="md"
      width="100%"
      minWidth="0"
      mb="lg"
    >
      <Flex align="center" gap="md" minWidth="0" flexGrow="1">
        <Flex
          centered
          flexShrink="0"
          r="md"
          width="2.75em"
          height="2.75em"
          bg={colorWithOpacity('custom-500', '10%')}
        >
          <Icon
            icon={appearance.icon ?? props.icon ?? module.icon}
            color="primary"
            size="1.25rem"
            preserveStyle={!!appearance.icon}
          />
        </Flex>
        <Stack minWidth="0" gap="xs">
          <Text as="h1" size="3xl" weight="semibold" tracking="tight" truncate>
            {heading}
          </Text>
          {description && (
            <Text as="p" size="sm" color="muted">
              {description}
            </Text>
          )}
        </Stack>
      </Flex>
      {props.trailing && (
        <Flex align="center" gap="sm">
          {props.trailing}
        </Flex>
      )}
    </Flex>
  )
}
