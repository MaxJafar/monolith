import _ from 'lodash'

import { useModuleMetadata } from '@lifeforge/federation'
import { useModuleTranslation } from '@lifeforge/localization'

import { Box, Flex, Icon, Text } from '@/components/primitives'
import { colorWithOpacity } from '@/system'

function getTKeys(
  namespace: string | undefined,
  title: string,
  target: string
) {
  const withPrefix = (middle: string) => [
    `${middle}${_.camelCase(title)}.${target}`,
    `${middle}${title}.${target}`,
    ...(namespace
      ? [
          `${namespace}:${middle}${_.camelCase(title)}.${target}`,
          `${namespace}:${middle}${title}.${target}`
        ]
      : [])
  ]

  return [
    ...withPrefix('subsections.'),
    ...withPrefix(''),
    ...(namespace ? [`${namespace}:${target}`] : []),
    target
  ]
}

interface ModuleHeaderProps {
  icon?: string
  title?: string
  trailing?: React.ReactNode
  namespace?: string | false
}

export function ModuleHeader({
  icon,
  title,
  trailing,
  namespace
}: ModuleHeaderProps) {
  const { title: innerTitle, icon: innerIcon } = useModuleMetadata()

  title = title ?? innerTitle
  icon = icon ?? innerIcon

  const { t } = useModuleTranslation(
    typeof namespace === 'string'
      ? [namespace, 'common.sidebar']
      : ['common.sidebar']
  )

  return (
    <Flex
      data-module-header
      align={{ base: 'start', sm: 'center' }}
      as="header"
      direction={{ base: 'column', sm: 'row' }}
      gap="md"
      justify="between"
      mb="lg"
      minWidth="0"
      width="100%"
    >
      <Flex align="center" gap="md" minWidth="0" width="100%">
        <Flex
          align="center"
          bg={colorWithOpacity('custom-500', '10%')}
          flexShrink="0"
          height="2.75em"
          justify="center"
          r="md"
          width="2.75em"
        >
          <Icon color="primary" icon={icon} size="1.25rem" />
        </Flex>
        <Flex direction="column" gap="xs" minWidth="0" width="100%">
          <Text
            asChild
            size="3xl"
            tracking="tight"
            weight="semibold"
            whiteSpace="nowrap"
          >
            <Flex
              align="end"
              as="h1"
              minWidth="0"
              style={{ gap: '0.75rem' }}
              width="100%"
            >
              <Text truncate display="block">
                {namespace === false
                  ? title
                  : t(getTKeys(namespace, title, 'title'))}
              </Text>
            </Flex>
          </Text>
          <Box asChild minWidth="0" width="100%">
            <Text
              color="muted"
              size="sm"
              whiteSpace={{ base: 'normal', sm: 'nowrap' }}
            >
              {namespace === false
                ? `Description for ${title}`
                : t(getTKeys(namespace, title, 'description'))}
            </Text>
          </Box>
        </Flex>
      </Flex>
      <Flex align="center" gap="sm">
        {trailing}
      </Flex>
    </Flex>
  )
}
