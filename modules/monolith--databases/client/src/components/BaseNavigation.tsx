import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack, Text } from '@monolith/ui'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'

import { BaseEditor } from './BaseEditor'
import { DatabasePanel } from './DatabasePanel'

export function BaseNavigation() {
  const { data, base, index, busy, readOnly } = useDatabases()
  const { t } = useModuleTranslation()
  const [creating, setCreating] = useState<HTMLElement | null>(null)
  const [params] = useSearchParams()

  const workspace = params.get('workspace')

  return (
    <Stack
      aria-label={t('title')}
      as="nav"
      flexShrink="0"
      gap="sm"
      minWidth="0"
      width={{ base: '100%', lg: '14rem' }}
    >
      <Text
        truncate
        as="h2"
        className="zillion-database-collection-heading"
        color="muted"
        leading="normal"
        size="sm"
        weight="medium"
      >
        {t('workspace')}
      </Text>
      <Flex direction={{ base: 'row', lg: 'column' }} gap="xs" wrap="wrap">
        <Button
          as={Link}
          to={`?${new URLSearchParams(workspace ? { workspace } : {})}`}
          namespace="common.systemViews"
          icon="lucide:arrow-left"
          variant="plain"
          justify="start"
          p="sm"
        >
          allDatabases
        </Button>
        {data.bases.map(item => (
          <Button
            key={item.id}
            aria-current={base?.id === item.id ? 'page' : undefined}
            as={Link}
            icon="tabler:database"
            iconProps={{ color: base?.id === item.id ? 'primary' : 'muted' }}
            justify="start"
            maxWidth="100%"
            minHeight={{ base: '44px', lg: '36px' }}
            namespace={false}
            px="sm"
            py="xs"
            r="sm"
            textProps={{
              color: base?.id === item.id ? 'primary' : undefined,
              weight: 'medium'
            }}
            title={item.name}
            to={`?${new URLSearchParams({ base: item.id, ...(workspace ? { workspace } : {}) })}`}
            variant={base?.id === item.id ? 'secondary' : 'plain'}
            width={{ base: 'auto', lg: '100%' }}
          >
            <Flex
              align="center"
              gap="sm"
              justify="between"
              minWidth="0"
              width="100%"
            >
              <Text
                truncate
                color={base?.id === item.id ? 'primary' : undefined}
                weight="medium"
              >
                {item.name}
              </Text>
              <Text color="muted">
                {index.recordsByBase.get(item.id)?.length ?? 0}
              </Text>
            </Flex>
          </Button>
        ))}
        <Button
          aria-expanded={!!creating}
          disabled={busy || readOnly}
          icon="tabler:plus"
          justify="start"
          minHeight={{ base: '44px', lg: '36px' }}
          px="sm"
          py="xs"
          variant="plain"
          onClick={event => setCreating(creating ? null : event.currentTarget)}
        >
          newBase
        </Button>
      </Flex>
      {creating && (
        <DatabasePanel
          anchor={creating}
          title={t('buttons.newBase')}
          width={360}
          onClose={() => setCreating(null)}
        >
          <BaseEditor onDone={() => setCreating(null)} />
        </DatabasePanel>
      )}
      {!data.bases.length && <Text color="muted">{t('baseHelp')}</Text>}
    </Stack>
  )
}
