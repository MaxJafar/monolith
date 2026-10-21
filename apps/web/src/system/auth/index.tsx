// SPDX-License-Identifier: 0BSD
import { useQuery } from '@tanstack/react-query'

import { Button, Stack, Text } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import LoginPage from './pages/LoginPage'
import UserCreationPage from './pages/UserCreationPage'

export default function Auth() {
  const bootstrap = useQuery(workspaceAPI.user.exists.queryOptions())
  if (bootstrap.isPending)
    return <Text role="status">Connecting to your workspace…</Text>
  if (bootstrap.error)
    return (
      <Stack gap="md" align="center">
        <Text role="alert">{bootstrap.error.message}</Text>
        <Button
          namespace={false}
          loading={bootstrap.isFetching}
          onClick={async () => {
            await bootstrap.refetch()
          }}
        >
          Try connecting again
        </Button>
      </Stack>
    )
  return bootstrap.data ? <LoginPage /> : <UserCreationPage />
}
