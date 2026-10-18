import { Link, useNavigate } from 'react-router'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  SearchInput,
  Stack,
  TagChip,
  Text
} from '@monolith/ui'

import { useTechLab } from '@/TechLabContext'
import { DeviceEditor } from '@/components/DeviceEditor'
import { DeviceTelemetry } from '@/components/DeviceTelemetry'
import { ServiceCard } from '@/components/ServiceCard'
import { workspaceAPI } from '@/manifest'
import { safeWebUrl, sectionParams } from '@/utils/navigation'

export default function DevicesView() {
  const { t } = useModuleTranslation()
  const { data, params, updateParams, pending, run } = useTechLab()
  const navigate = useNavigate()

  if (!data) return null

  const id = params.get('device')
  const device = data.devices.find(device => device.id === id)
  const search = (params.get('q') ?? '').trim().toLocaleLowerCase()
  const visible = data.devices.filter(device =>
    [
      device.name,
      device.kind,
      device.host,
      device.os,
      device.location,
      ...device.tags
    ].some(value => value.toLocaleLowerCase().includes(search))
  )
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('device')
    next.delete('edit')
    navigate({ search: next.toString() })
  }

  if (id === 'new' || (device && params.get('edit') === '1'))
    return <DeviceEditor key={id} device={device} onDone={close} />

  async function remove() {
    if (
      !device ||
      !window.confirm(t('messages.deleteDevice', { name: device.name }))
    )
      return

    const result = await run(() =>
      workspaceAPI.devices.delete.mutate({
        id: device.id,
        expected_updated: device.updated
      })
    )

    if (result.ok) close()
  }

  if (device) {
    const managementUrl = safeWebUrl(device.management_url)
    const linked = data.services.filter(
      service => service.device_id === device.id
    )

    return (
      <Stack gap="lg">
        <Card gap="md">
          <Flex align="center" gap="md" justify="between" wrap="wrap">
            <Text as="h2" overflowWrap="anywhere" size="2xl" weight="semibold">
              {device.name}
            </Text>
            <Flex gap="sm" wrap="wrap">
              <Button
                as={Link}
                to={{
                  search: sectionParams('devices', {
                    device: device.id,
                    edit: '1'
                  }).toString()
                }}
                variant="secondary"
              >
                edit
              </Button>
              <Button
                dangerous
                loading={pending}
                variant="plain"
                onClick={() => void remove()}
              >
                delete
              </Button>
              <Button variant="plain" onClick={close}>
                back
              </Button>
            </Flex>
          </Flex>
          <Grid gap="md" templateCols={{ base: 1, sm: 2, lg: 3 }}>
            {(
              [
                'kind',
                'host',
                'os',
                'cpu',
                'gpu',
                'ram_gb',
                'storage',
                'location'
              ] as const
            ).map(field => (
              <Stack key={field} gap="xs">
                <Text color="muted" size="sm">
                  {t(`inputs.${field}`)}
                </Text>
                <Text
                  className={
                    field === 'host' ? 'tech-lab-technical' : undefined
                  }
                >
                  {device[field] === null || device[field] === ''
                    ? '—'
                    : String(device[field]) + (field === 'ram_gb' ? ' GB' : '')}
                </Text>
              </Stack>
            ))}
          </Grid>
          <Flex gap="sm" wrap="wrap">
            {device.tags.map(tag => (
              <TagChip key={tag} label={tag} variant="outlined" />
            ))}
          </Flex>
          {device.notes && <Text whiteSpace="pre-wrap">{device.notes}</Text>}
          {managementUrl && (
            <Button
              as="a"
              href={managementUrl}
              icon="lucide:external-link"
              rel="noopener noreferrer"
              target="_blank"
              variant="secondary"
            >
              devices.openManagement
            </Button>
          )}
        </Card>
        <DeviceTelemetry id={device.id} />
        <Text as="h3" size="xl" weight="semibold">
          {t('devices.linkedServices', { count: linked.length })}
        </Text>
        <Grid gap="md" templateCols={{ base: 1, md: 2 }}>
          {linked.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </Grid>
        {!linked.length && <Text color="muted">{t('devices.noServices')}</Text>}
        <Button
          as={Link}
          to={{
            search: sectionParams('services', { device: device.id }).toString()
          }}
          variant="secondary"
        >
          sections.services
        </Button>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      {id && (
        <Card role="alert">
          <Text>{t('messages.notFound')}</Text>
        </Card>
      )}
      <Flex align="center" gap="md" wrap="wrap">
        <Flex flex="1" minWidth="14rem">
          <SearchInput
            searchTarget="devices"
            value={params.get('q') ?? ''}
            onChange={q => updateParams({ q })}
          />
        </Flex>
        <Button
          as={Link}
          icon="lucide:plus"
          to={{
            search: sectionParams('devices', { device: 'new' }).toString()
          }}
        >
          addDevice
        </Button>
      </Flex>
      <Text color="muted">
        {t('filters.results', {
          count: visible.length,
          total: data.devices.length
        })}
      </Text>
      <Grid gap="md" templateCols={{ base: 1, md: 2, xl: 3 }}>
        {visible.map(device => (
          <Card key={device.id} gap="md">
            <Text as="h3" overflowWrap="anywhere" size="lg" weight="semibold">
              {device.name}
            </Text>
            <Text color="muted">
              {device.kind} · {device.location || '—'}
            </Text>
            <Text className="tech-lab-technical">{device.host || '—'}</Text>
            <Flex gap="sm" wrap="wrap">
              {device.tags.map(tag => (
                <TagChip key={tag} label={tag} variant="outlined" />
              ))}
            </Flex>
            <Button
              as={Link}
              to={{
                search: sectionParams('devices', {
                  device: device.id
                }).toString()
              }}
              variant="secondary"
            >
              details
            </Button>
          </Card>
        ))}
      </Grid>
      {!visible.length && (
        <Card>
          <Text>
            {t(data.devices.length ? 'messages.noMatches' : 'devices.empty')}
          </Text>
        </Card>
      )}
    </Stack>
  )
}
