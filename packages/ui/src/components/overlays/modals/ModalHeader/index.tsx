import { useModuleTranslation } from '@monolith/localization'
import { useDebounce } from '@uidotdev/usehooks'
import _ from 'lodash'

import { Button } from '@/components/inputs'
import { Flex, Icon, Text } from '@/components/primitives'

function getLocaleKeys(innerTitle: string, namespace?: string) {
  return [
    `modals.${_.camelCase(innerTitle)}.title`,
    `modals.${_.camelCase(innerTitle)}`,
    `${_.camelCase(innerTitle)}.title`,
    `${_.camelCase(innerTitle)}`,
    `${innerTitle}.title`,
    `${innerTitle}`,
    `modals.${innerTitle}.title`,
    `modals.${innerTitle}`
  ].map(e => (namespace ? `${namespace}:${e}` : e))
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  onClose,
  className = '',
  appendTitle,
  namespace = 'common.modals',
  trailing,
  titleId
}: {
  title: string | React.ReactNode
  subtitle?: React.ReactNode
  icon: string
  onClose: () => void
  className?: string
  appendTitle?: React.ReactElement
  namespace?: string | false
  trailing?: React.ReactNode
  titleId?: string
}) {
  const { t } = useModuleTranslation(
    namespace ? [namespace, 'common.buttons'] : ['common.buttons']
  )
  // Add some delay to prevent the title and icon to become empty
  // when the modal is transitioned

  const innerTitle = useDebounce(title, 100)
  const innerIcon = useDebounce(icon, 100)

  return (
    <Flex
      align="center"
      className={`monolith-modal-heading ${className}`}
      justify="between"
      mb="md"
      gap="sm"
    >
      <Flex align="center" minWidth="0" gap="sm" flex="1">
        <Icon
          icon={innerIcon}
          size={subtitle ? '1.5em' : '1.25em'}
          color="muted"
        />
        <Flex direction="column" minWidth="0" width="100%">
          <Text asChild size="lg" weight="semibold">
            <Flex
              id={titleId}
              align="center"
              as="h1"
              minWidth="0"
              gap="sm"
              width="100%"
            >
              {typeof innerTitle === 'string' ? (
                <>
                  <Text truncate as="span" style={{ minWidth: 0 }}>
                    {namespace === false
                      ? innerTitle
                      : t(
                          [
                            ...getLocaleKeys(innerTitle),
                            ...(namespace
                              ? getLocaleKeys(innerTitle, namespace)
                              : []),
                            ...getLocaleKeys(innerTitle, 'common.modals')
                          ],
                          {
                            defaultValue: innerTitle
                          }
                        )}
                  </Text>
                  {appendTitle}
                </>
              ) : (
                innerTitle
              )}
            </Flex>
          </Text>
          {subtitle && (
            <Text color="muted" size={{ base: 'sm', sm: 'base' }}>
              {subtitle}
            </Text>
          )}
        </Flex>
      </Flex>
      <Flex align="center" gap="xs" flexShrink="0">
        {trailing}
        <Button
          aria-label={t('common.buttons:close')}
          icon="tabler:x"
          p="xs"
          variant="plain"
          onClick={onClose}
        />
      </Flex>
    </Flex>
  )
}
