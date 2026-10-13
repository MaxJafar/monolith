import dayjs from 'dayjs'
import { useState } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Card, Flex, Stack, Text } from '@lifeforge/ui'

import { useAgents } from '@/AgentContext'
import { forgeAPI } from '@/manifest'

import { type Principal } from '../../../shared'

export default function Credentials({ person }: { person: Principal }) {
  const { t } = useModuleTranslation(),
    { data, act, busy } = useAgents(),
    [token, setToken] = useState(''),
    [copied, setCopied] = useState(false)

  async function issue() {
    await act(async () => {
      const result = await forgeAPI.accessKeys.create.mutate({
        principal_id: person.id,
        name: 'Workspace worker',
        days: 7
      })
      setToken(result.token)
      setCopied(false)
    })
  }

  return (
    <Card gap="md">
      <Text as="h3" weight="semibold">
        {t('workerConnection')}
      </Text>
      <Text color="muted">{t('workerHint')}</Text>
      <Button
        disabled={busy || person.status !== 'active'}
        icon="tabler:key"
        namespace={false}
        variant="secondary"
        onClick={() => {
          void issue()
        }}
      >
        {t('issueKey')}
      </Button>
      {token && (
        <Stack>
          <Text color="muted">{t('tokenOnce')}</Text>
          <Box className="zillion-agent-content">
            <Text as="code" size="sm">
              {token}
            </Text>
          </Box>
          <Flex gap="sm">
            <Button
              namespace={false}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token)
                  setCopied(true)
                } catch {
                  setCopied(false)
                }
              }}
            >
              {t(copied ? 'copied' : 'copy')}
            </Button>
            <Button
              namespace={false}
              variant="secondary"
              onClick={() => setToken('')}
            >
              {t('hideToken')}
            </Button>
          </Flex>
        </Stack>
      )}
      {data.credentials
        .filter(k => k.principal_id === person.id)
        .map(k => (
          <Flex
            key={k.id}
            align="center"
            gap="sm"
            justify="between"
            wrap="wrap"
          >
            <Stack flex="1">
              <Text>{k.name}</Text>
              <Text color="muted" size="sm">
                {t(k.revoked ? 'revoked' : 'expires', {
                  date: new Intl.DateTimeFormat().format(
                    dayjs(k.expires).valueOf()
                  )
                })}
              </Text>
            </Stack>
            {!k.revoked && (
              <Button
                dangerous
                disabled={busy}
                namespace={false}
                variant="plain"
                onClick={() => {
                  void act(async () => {
                    await forgeAPI.accessKeys.revoke
                      .input({ id: k.id })
                      .mutate(undefined)
                    setToken('')
                    setCopied(false)
                  })
                }}
              >
                {t('revoke')}
              </Button>
            )}
          </Flex>
        ))}
    </Card>
  )
}
