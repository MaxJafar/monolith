import { getNativeRuntime, useAuth } from '@monolith/api'
import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Icon,
  Stack,
  Text
} from '@monolith/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useRpg } from '@/addons/urpg/useRpg'
import { useWorkspace } from '@/core/workspaces/WorkspaceProvider'
import { workspaceAPI } from '@/core/workspaces/workspaceAPI'

import './overlays.css'

export default function WorkspaceUtilities() {
  const { t } = useTranslation('common', { keyPrefix: 'utilities' })
  const [surface, setSurface] = useState<{
    kind: 'desktop' | 'connections' | 'activity'
    anchor: HTMLElement
  } | null>(null)
  return (
    <>
      <Flex gap="xs" py="xs" justify="between">
        {(
          [
            ['desktop', 'lucide:monitor'],
            ['connections', 'lucide:plug'],
            ['activity', 'lucide:activity']
          ] as const
        ).map(([kind, icon]) => (
          <Button
            key={kind}
            namespace={false}
            variant="plain"
            icon={icon}
            aria-label={t(kind)}
            title={t(kind)}
            aria-expanded={surface?.kind === kind}
            flex="1"
            onClick={e =>
              setSurface(
                surface?.kind === kind
                  ? null
                  : { kind, anchor: e.currentTarget }
              )
            }
          >
            <Text size="xs">{t(kind)}</Text>
          </Button>
        ))}
      </Flex>
      {surface && (
        <FloatingPopover
          anchor={surface.anchor}
          label={t(surface.kind)}
          side="right"
          width={370}
          className="workspace-utility-popover"
          onClose={() => setSurface(null)}
        >
          <Stack gap="md">
            <Flex align="center" justify="between">
              <Text size="sm" weight="semibold">
                {t(surface.kind)}
              </Text>
              <Button
                namespace={false}
                variant="plain"
                icon="lucide:x"
                aria-label={t('close')}
                onClick={() => setSurface(null)}
              />
            </Flex>
            <UtilityContent
              kind={surface.kind}
              onClose={() => setSurface(null)}
            />
          </Stack>
        </FloatingPopover>
      )}
    </>
  )
}

function UtilityContent({
  kind,
  onClose
}: {
  kind: 'desktop' | 'connections' | 'activity'
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'utilities' }),
    { active } = useWorkspace(),
    { userData } = useAuth(),
    rpg = useRpg(),
    native = getNativeRuntime()
  const options = workspaceAPI.workspaceDatabases.snapshot
    .input({
      workspace_id: active?.id ?? '00000000-0000-4000-8000-000000000000'
    })
    .queryOptions()
  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, userData?.id],
    enabled: !!active
  })
  const [drafts, setDrafts] = useState<{ title: string; href: string }[]>([]),
    [draftError, setDraftError] = useState(false)
  useEffect(() => {
    let current = true
    if (native)
      void native.drafts
        .list(native.profile.serverId, native.profile.accountId)
        .then(rows => {
          if (current)
            setDrafts(
              rows
                .filter(d => d.dirty && d.workspaceId === active?.id)
                .map(d => ({
                  title: d.snapshot.meta.title || t('untitled'),
                  href:
                    d.source.kind === 'page'
                      ? `/page/${d.source.id}?workspace=${d.workspaceId}`
                      : d.source.kind === 'record'
                        ? `/databases?record=${d.source.id}&workspace=${d.workspaceId}`
                        : `/notes?searchItem=${d.source.id}`
                }))
            )
        })
        .catch(() => {
          if (current) setDraftError(true)
        })
    return () => {
      current = false
    }
  }, [native, active?.id, t])
  if (kind === 'activity') {
    const entries = [
      ...(query.data?.records ?? []).map(r => ({
        id: r.id,
        title: r.title,
        at: r.updated,
        detail: t('pageUpdated'),
        href: `/databases?workspace=${active?.id}&base=${r.base_id}&record=${r.id}`
      })),
      ...(rpg.state?.ledger ?? [])
        .filter(e => !e.voided)
        .map(e => ({
          id: e.id,
          title: e.title,
          at: e.at,
          detail: `+${e.xp} XP`,
          href: `/urpg?workspace=${active?.id}&view=reflection`
        })),
      ...(rpg.state?.encounters ?? []).map(e => ({
        id: e.id,
        title: e.title,
        at: e.at,
        detail: `${e.minutes} min`,
        href: `/urpg?workspace=${active?.id}&view=encounters`
      }))
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 20)
    return (
      <Stack gap="sm">
        <Text size="xs" color="muted">
          {active?.name} · {t('recentChanges')}
        </Text>
        <Box maxHeight="370px" overflowY="auto">
          {entries.map(e => (
            <Button
              key={e.id}
              as={Link}
              to={e.href}
              namespace={false}
              variant="plain"
              justify="start"
              width="100%"
              py="sm"
              onClick={onClose}
            >
              <Flex gap="sm" align="start" width="100%">
                <Icon icon="lucide:circle-check" size="16px" />
                <Stack gap="xs" minWidth="0">
                  <Text truncate size="sm">
                    {e.title}
                  </Text>
                  <Text size="xs" color="muted">
                    {e.detail} ·{' '}
                    {new Date(e.at).toLocaleString(i18n.language, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </Stack>
              </Flex>
            </Button>
          ))}
        </Box>
        {!entries.length && (
          <Text size="sm" color="muted">
            {t(query.isPending ? 'loading' : 'noActivity')}
          </Text>
        )}
        {query.isError && (
          <Text role="alert" size="xs">
            {t('unavailable')}
          </Text>
        )}
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:refresh-cw"
          onClick={() => {
            void query.refetch()
            if (rpg.enabled) void rpg.query.refetch()
          }}
        >
          {t('refresh')}
        </Button>
      </Stack>
    )
  }
  return (
    <Stack gap="md">
      <Flex align="center" gap="sm">
        <Icon
          icon={native ? 'lucide:monitor-check' : 'lucide:globe'}
          size="24px"
        />
        <Stack gap="xs">
          <Text size="sm" weight="medium">
            {native
              ? `Monolith · ${native.host.platform === 'windows' ? 'Windows' : 'macOS'}`
              : t('browserApp')}
          </Text>
          <Text size="xs" color="muted">
            {query.isError
              ? t('unavailable')
              : query.isPending
                ? t('checking')
                : t('connected')}
          </Text>
        </Stack>
      </Flex>
      <Box className="workspace-utility-detail" p="sm" r="sm">
        <Text as="p" size="xs" color="muted">
          {t('server')}
        </Text>
        <Text as="p" size="sm">
          {native?.profile.origin ??
            import.meta.env.VITE_API_HOST ??
            'http://localhost:3636'}
        </Text>
      </Box>
      <Text size="xs" color="muted">
        {t('workspace')}: {active?.name}
      </Text>
      {kind === 'desktop' && (
        <>
          <Text size="sm" color="muted">
            {t(native ? 'desktopHelp' : 'browserHelp')}
          </Text>
          {native && (
            <>
              <Text size="xs" weight="medium">
                {t('drafts', { count: drafts.length })}
              </Text>
              {drafts.map(d => (
                <Button
                  key={d.href}
                  as={Link}
                  to={d.href}
                  namespace={false}
                  variant="plain"
                  justify="start"
                  icon="lucide:file-pen"
                  onClick={onClose}
                >
                  {d.title}
                </Button>
              ))}
              {draftError && (
                <Text size="xs" role="alert">
                  {t('draftError')}
                </Text>
              )}
            </>
          )}
        </>
      )}
      {kind === 'connections' && (
        <>
          <Button
            as={Link}
            to="/api-keys"
            namespace={false}
            variant="plain"
            justify="start"
            icon="lucide:key-round"
            onClick={onClose}
          >
            {t('apiVault')}
          </Button>
          <Button
            as={Link}
            to={`/calendar/sources?workspace=${active?.id}`}
            namespace={false}
            variant="plain"
            justify="start"
            icon="lucide:calendar-days"
            onClick={onClose}
          >
            {t('calendarSources')}
          </Button>
          <Text size="xs" color="muted">
            {t('connectionsHelp')}
          </Text>
        </>
      )}
      {native && (
        <Button
          namespace={false}
          variant="secondary"
          icon="lucide:settings-2"
          onClick={() => {
            onClose()
            window.dispatchEvent(new Event('monolith-show-connection'))
          }}
        >
          {t('manageConnection')}
        </Button>
      )}
      <Button
        namespace={false}
        variant="plain"
        icon="lucide:refresh-cw"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {t('refresh')}
      </Button>
    </Stack>
  )
}
