import { type RoomIdentity, roomFingerprint } from '@monolith/api'
import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import workspaceAPI from '@/core/utils/workspaceAPI'

import { useRooms } from '../RoomsContext'
import { useRoomsEncryption } from '../RoomsEncryption'
import { useRoomsNotifications } from '../RoomsNotifications'

export function EncryptionSetup() {
  const encryption = useRoomsEncryption()
  const { t } = useTranslation('common.rooms')
  const [password, setPassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setPending(true)
    setError('')

    try {
      if (file) await encryption.restore(file, password)
      else await encryption.initialize(password)
      setPassword('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('failed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack aria-label={t('encryptionSetup')} gap="sm" p="md" role="region">
      <Text weight="semibold">
        {t(encryption.own.data ? 'restoreEncryption' : 'encryptionSetup')}
      </Text>
      <Text color="muted" size="sm">
        {t('encryptionSetupHelp')}
      </Text>
      <TextInput
        isPassword
        autoComplete="new-password"
        label="recoveryPassword"
        namespace="common.rooms"
        placeholder={t('recoveryPasswordHint')}
        value={password}
        onChange={setPassword}
      />
      <Box
        accept="application/json,.json"
        aria-label={t('recoveryFile')}
        as="input"
        disabled={pending}
        type="file"
        onChange={event => setFile(event.target.files?.[0] ?? null)}
      />
      <Button
        disabled={
          !encryption.loaded ||
          encryption.own.status !== 'success' ||
          (!file &&
            !encryption.identity &&
            (!!encryption.own.data || password.length < 12)) ||
          (!!file && !password)
        }
        loading={pending}
        namespace="common.rooms"
        onClick={() => {
          void run()
        }}
      >
        {file ? 'restoreEncryption' : 'enableEncryption'}
      </Button>
      {(error || encryption.error || encryption.own.error) && (
        <Text color="dangerous" role="alert" size="sm">
          {error || encryption.error || encryption.own.error?.message}
        </Text>
      )}
      {encryption.own.error && (
        <Button
          namespace="common.rooms"
          variant="plain"
          onClick={() => {
            void encryption.own.refetch()
          }}
        >
          retry
        </Button>
      )}
    </Stack>
  )
}

function Fingerprint({
  identity,
  name
}: {
  identity: RoomIdentity
  name: string
}) {
  const [fingerprint, setFingerprint] = useState('')

  useEffect(() => {
    let current = true
    void roomFingerprint(identity).then(value => {
      if (current) setFingerprint(value)
    })

    return () => {
      current = false
    }
  }, [identity])

  return (
    <Stack gap="xs">
      <Text size="sm" weight="medium">
        {name}
      </Text>
      <Text as="code" size="xs" style={{ overflowWrap: 'anywhere' }}>
        {fingerprint}
      </Text>
    </Stack>
  )
}

export default function RoomSecurity({ setup = false }: { setup?: boolean }) {
  const { t } = useTranslation('common.rooms')
  const { scope, actor, people } = useRooms()
  const encryption = useRoomsEncryption()
  const notifications = useRoomsNotifications()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const options = workspaceAPI.rooms.keys.input(scope).queryOptions()
  const keys = useQuery({
    ...options,
    queryFn: () => encryption.roster(scope),
    queryKey: [...options.queryKey, actor],
    enabled: !!anchor,
    staleTime: 10000
  })

  function download() {
    if (!encryption.identity) return

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(encryption.identity.backup)], {
        type: 'application/json'
      })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `rooms-recovery-${actor.slice(0, 8)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <Button
        aria-label={t(setup ? 'encryptionSetup' : 'securityAndNotifications')}
        icon="lucide:shield-check"
        namespace="common.rooms"
        variant={setup ? 'secondary' : 'plain'}
        onClick={event => setAnchor(event.currentTarget)}
      >
        {setup ? 'encryptionSetup' : undefined}
      </Button>
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={t('securityAndNotifications')}
          width={432}
          onClose={() => setAnchor(null)}
        >
          <Stack
            gap="md"
            maxHeight="70vh"
            minWidth="0"
            overflowY="auto"
            width="100%"
          >
            <Text weight="semibold">{t('securityAndNotifications')}</Text>
            {encryption.ready ? (
              <>
                <Text size="sm">{t('encryptionReady')}</Text>
                <Text color="muted" size="sm">
                  {t('recoveryHelp')}
                </Text>
                <Button
                  icon="lucide:download"
                  namespace="common.rooms"
                  onClick={download}
                >
                  downloadRecovery
                </Button>
                <Text color="muted" size="sm">
                  {t('fingerprintHelp')}
                </Text>
                {!keys.error &&
                  keys.data?.identities.map(identity => (
                    <Fingerprint
                      key={identity.owner_id}
                      identity={identity}
                      name={
                        people.data?.find(p => p.id === identity.owner_id)
                          ?.name ?? identity.owner_id
                      }
                    />
                  ))}
                {!!keys.data?.missing.length && (
                  <Text role="status" size="sm">
                    {t('waitingEncryption', {
                      names: keys.data.missing.map(p => p.name).join(', ')
                    })}
                  </Text>
                )}
                {keys.error && (
                  <Text color="dangerous" role="alert" size="sm">
                    {keys.error.message}
                  </Text>
                )}
              </>
            ) : (
              <EncryptionSetup />
            )}
            <Text size="sm" weight="medium">
              {t('notifications')}
            </Text>
            <Text color="muted" size="sm">
              {t('platformNotificationsHelp')}
            </Text>
            <Flex gap="sm">
              <Button
                aria-pressed={notifications.enabled}
                namespace="common.rooms"
                variant="secondary"
                onClick={() => {
                  void notifications.toggle()
                }}
              >
                {notifications.enabled
                  ? 'disableNotifications'
                  : 'enableNotifications'}
              </Button>
            </Flex>
            {notifications.error && (
              <Text color="dangerous" role="alert" size="sm">
                {notifications.error}
              </Text>
            )}
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}
