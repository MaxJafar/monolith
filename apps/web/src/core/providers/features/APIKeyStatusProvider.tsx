// SPDX-License-Identifier: 0BSD
import { useQuery } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { ModuleGroup } from '@monolith/configs'
import {
  Button,
  Card,
  EmptyStateScreen,
  Stack,
  Text,
  WithQuery
} from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

export default function APIKeyStatusProvider({
  APIKeyAccess,
  children
}: {
  APIKeyAccess: ModuleGroup['items'][number]['APIKeyAccess']
  children: ReactNode
}) {
  const { t } = useTranslation('common.api-keys')
  const requirements = Object.entries(APIKeyAccess ?? {}).filter(
    ([, access]) => access.required
  )
  const lookup = useQuery(
    workspaceAPI
      .checkAPIKeys({ keys: requirements.map(([id]) => id).join(',') })
      .queryOptions({ enabled: requirements.length > 0 })
  )
  if (!requirements.length) return children
  return (
    <WithQuery query={lookup}>
      {available =>
        available ? (
          children
        ) : (
          <EmptyStateScreen
            icon="tabler:key-off"
            message={{
              title: t('missing.title'),
              description: (
                <Stack gap="sm">
                  <Text color="muted">{t('missing.description')}</Text>
                  {requirements.map(([id, access]) => (
                    <Card key={id}>
                      <Text as="code">{id}</Text>
                      <Text as="p" color="muted">
                        {access.usage}
                      </Text>
                    </Card>
                  ))}
                  <Button
                    as={Link}
                    to="/api-keys"
                    icon="tabler:key"
                    namespace="common.api-keys"
                  >
                    configAPIKeys
                  </Button>
                </Stack>
              )
            }}
          />
        )
      }
    </WithQuery>
  )
}
