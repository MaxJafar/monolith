import { useTranslation } from 'react-i18next'

import type {
  PlatformUpdateStatus,
  UpdateAction,
  UpdatePreferences
} from '@monolith/configs'
import {
  Box,
  Button,
  ChoiceSelect,
  Flex,
  Stack,
  Switch,
  Text
} from '@monolith/ui'

import './updates.css'

export default function UpdateCard({
  title,
  state,
  canManage,
  pending,
  error,
  native = false,
  onAction
}: {
  title: string
  state?: PlatformUpdateStatus
  canManage: boolean
  pending?: boolean
  error?: string
  native?: boolean
  onAction: (action: UpdateAction, preferences?: UpdatePreferences) => void
}) {
  const { t } = useTranslation('common')

  const label = (key: string) => t(`updates.${key}`)
  const busy =
    pending ||
    (!!state &&
      [
        'checking',
        'downloading',
        'verifying',
        'installing',
        'restarting',
        'rollingBack'
      ].includes(state.phase))
  const disabled = !canManage || busy || !state?.configured
  const percent = state?.total
    ? Math.min(100, Math.round((state.received / state.total) * 100))
    : 0
  const updatePreferences = (changes: Partial<UpdatePreferences>) =>
    state && onAction('settings', { ...state.preferences, ...changes })

  return (
    <Stack className="monolith-update-card" gap="md">
      <Flex
        align="center"
        className="monolith-update-card-header"
        gap="md"
        justify="between"
      >
        <Stack gap="xs">
          <Text as="h2" weight="semibold">
            {title}
          </Text>
          <Text color="muted" size="sm">
            {state?.currentVersion
              ? t('updates.installedVersion', { version: state.currentVersion })
              : label('connecting')}
          </Text>
        </Stack>
        <Button
          disabled={disabled}
          icon="lucide:refresh-cw"
          namespace={false}
          variant="secondary"
          onClick={() => onAction('check')}
        >
          {label('check')}
        </Button>
      </Flex>
      {state && !state.configured && (
        <Text color="muted" size="sm">
          {label(native ? 'nativeSetup' : 'serverSetup')}
        </Text>
      )}
      {state?.configured && (
        <>
          <Text aria-live="polite" role="status" weight="medium">
            {label(`phases.${state.phase}`)}
            {state.release &&
            [
              'available',
              'downloading',
              'ready',
              'verifying',
              'installing'
            ].includes(state.phase)
              ? ` · ${state.release.version}`
              : ''}
          </Text>
          {busy && (
            <Stack gap="xs">
              <progress
                aria-label={label('progress')}
                max={100}
                value={state.phase === 'downloading' ? percent : undefined}
              />
              {state.phase === 'downloading' && (
                <Text color="muted" size="xs">
                  {percent}% · {(state.received / 1048576).toFixed(1)} /{' '}
                  {(state.total / 1048576).toFixed(1)} MB
                </Text>
              )}
            </Stack>
          )}
          {state.blocked && (
            <Text role="status" size="sm">
              {state.blocked}
            </Text>
          )}
          {state.release?.notes && (
            <details>
              <summary>{label('releaseNotes')}</summary>
              <Text as="p" className="monolith-update-notes" size="sm">
                {state.release.notes}
              </Text>
            </details>
          )}
          <Flex gap="sm" wrap="wrap">
            {['available', 'failed', 'rolledBack'].includes(state.phase) &&
              state.release &&
              !state.blocked && (
                <Button
                  disabled={disabled}
                  icon="lucide:download"
                  namespace={false}
                  onClick={() => onAction('download')}
                >
                  {label('download')}
                </Button>
              )}
            {state.phase === 'ready' && (
              <Button
                disabled={disabled || !!state.blocked}
                icon="lucide:rotate-cw"
                namespace={false}
                onClick={() => onAction('install')}
              >
                {label(native ? 'restartInstall' : 'installServer')}
              </Button>
            )}
          </Flex>
          <Box className="monolith-update-preferences">
            <Flex align="center" gap="lg" justify="between">
              <Text size="sm">{label('autoDownload')}</Text>
              <Switch
                aria-label={`${title}: ${label('autoDownload')}`}
                disabled={disabled}
                value={state.preferences.autoDownload}
                onChange={autoDownload => updatePreferences({ autoDownload })}
              />
            </Flex>
            <Flex align="center" gap="lg" justify="between">
              <Stack gap="xs">
                <Text size="sm">{label('autoInstall')}</Text>
                <Text color="muted" size="xs">
                  {label(native ? 'idleHelp' : 'windowHelp')}
                </Text>
              </Stack>
              <Switch
                aria-label={`${title}: ${label('autoInstall')}`}
                disabled={disabled}
                value={state.preferences.autoInstall}
                onChange={autoInstall =>
                  updatePreferences({
                    autoInstall,
                    ...(autoInstall ? { autoDownload: true } : {})
                  })
                }
              />
            </Flex>
            {!native && (
              <Flex
                align="center"
                className="monolith-update-select"
                gap="md"
                justify="between"
              >
                <Text size="sm">{label('hour')}</Text>
                <Box width="170px">
                  <ChoiceSelect
                    disabled={disabled}
                    label={label('hour')}
                    options={Array.from({ length: 24 }, (_, hour) => ({
                      value: String(hour),
                      label: `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00 UTC`
                    }))}
                    value={String(state.preferences.installHourUTC)}
                    onChange={value =>
                      updatePreferences({ installHourUTC: Number(value) })
                    }
                  />
                </Box>
              </Flex>
            )}
            <Flex
              align="center"
              className="monolith-update-select"
              gap="md"
              justify="between"
            >
              <Text size="sm">{label('channel')}</Text>
              <Box width="140px">
                <ChoiceSelect
                  disabled={disabled}
                  label={label('channel')}
                  options={['stable', 'beta'].map(value => ({
                    value,
                    label: label(value)
                  }))}
                  value={state.preferences.channel}
                  onChange={value =>
                    updatePreferences({ channel: value as 'stable' | 'beta' })
                  }
                />
              </Box>
            </Flex>
          </Box>
          {!canManage && (
            <Text color="muted" size="sm">
              {label('adminOnly')}
            </Text>
          )}
        </>
      )}
      {(error || state?.error) && (
        <Text role="alert" size="sm">
          {error || state?.error}
        </Text>
      )}
    </Stack>
  )
}
