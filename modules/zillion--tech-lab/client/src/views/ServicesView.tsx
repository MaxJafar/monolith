import { Link, useNavigate } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  Card,
  Flex,
  Grid,
  SearchInput,
  Stack,
  Text
} from '@lifeforge/ui'

import { useTechLab } from '@/TechLabContext'
import { HealthBadge } from '@/components/HealthBadge'
import { SelectInput } from '@/components/SelectInput'
import { ServiceCard } from '@/components/ServiceCard'
import { ServiceEditor } from '@/components/ServiceEditor'
import { forgeAPI } from '@/manifest'
import { filterServices } from '@/utils/health'
import { sectionParams } from '@/utils/navigation'

export default function ServicesView() {
  const { t } = useModuleTranslation()

  const { data, params, updateParams, healthByService, pending, run } =
    useTechLab()

  const navigate = useNavigate()

  if (!data) return null

  const id = params.get('service')
  const service = data.services.find(service => service.id === id)
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('service')
    next.delete('edit')
    navigate({ search: next.toString() })
  }

  if (id === 'new' || (service && params.get('edit') === '1'))
    return <ServiceEditor key={id} service={service} onDone={close} />

  async function remove() {
    if (
      !service ||
      !window.confirm(t('messages.deleteService', { name: service.name }))
    )
      return

    const result = await run(() =>
      forgeAPI.services.delete.mutate({
        id: service.id,
        expected_updated: service.updated
      })
    )

    if (result.ok) close()
  }

  if (service)
    return (
      <Stack gap="md">
        <Flex gap="sm" wrap="wrap">
          <Button
            as={Link}
            to={{
              search: sectionParams('services', {
                service: service.id,
                edit: '1'
              }).toString()
            }}
          >
            edit
          </Button>
          <Button variant="secondary" onClick={close}>
            back
          </Button>
          <Button
            dangerous
            loading={pending}
            variant="plain"
            onClick={() => void remove()}
          >
            delete
          </Button>
        </Flex>
        <ServiceCard service={service} />
        <Card gap="md">
          <Text as="h3" size="lg" weight="semibold">
            {t('health.configuration')}
          </Text>
          <Text>
            {t(`monitors.${service.monitor_kind}`)} ·{' '}
            {t('health.interval', {
              seconds: service.monitor_interval_seconds
            })}
          </Text>
          <Text className="tech-lab-technical">
            {service.monitor_target || '—'}
            {service.monitor_port ? `:${service.monitor_port}` : ''}
          </Text>
          <HealthBadge
            status={healthByService.get(service.id)?.status ?? 'unknown'}
          />
          <Text color="muted">{t('health.monitorHelp')}</Text>
          {service.notes && <Text whiteSpace="pre-wrap">{service.notes}</Text>}
          <Button
            as={Link}
            to={{
              search: sectionParams('health', {
                service: service.id
              }).toString()
            }}
            variant="secondary"
          >
            health.viewHistory
          </Button>
        </Card>
      </Stack>
    )

  const filters = {
    search: params.get('q') ?? '',
    kind: params.get('kind') ?? '',
    device: params.get('device') ?? '',
    category: params.get('category') ?? '',
    tag: params.get('tag') ?? '',
    status: params.get('status') ?? ''
  }
  const visible = filterServices(data.services, healthByService, filters)
  const categories = [
    ...new Set(data.services.map(service => service.category).filter(Boolean))
  ].sort()
  const tags = [
    ...new Set(data.services.flatMap(service => service.tags))
  ].sort()
  const active = Object.values(filters).filter(Boolean).length

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
            searchTarget="services"
            value={filters.search}
            onChange={q => updateParams({ q })}
          />
        </Flex>
        <Button
          as={Link}
          icon="lucide:plus"
          to={{
            search: sectionParams('services', { service: 'new' }).toString()
          }}
        >
          addService
        </Button>
      </Flex>
      <Grid gap="md" templateCols={{ base: 1, sm: 2, lg: 5 }}>
        <SelectInput
          label="inputs.kind"
          options={[
            { value: '', label: t('filters.allKinds') },
            ...(['service', 'game', 'link'] as const).map(value => ({
              value,
              label: t(`kinds.${value}`)
            }))
          ]}
          value={filters.kind}
          onChange={kind => updateParams({ kind })}
        />
        <SelectInput
          label="inputs.device"
          options={[
            { value: '', label: t('filters.allDevices') },
            { value: 'unassigned', label: t('filters.unassigned') },
            ...data.devices.map(device => ({
              value: device.id,
              label: device.name
            }))
          ]}
          value={filters.device}
          onChange={device => updateParams({ device })}
        />
        <SelectInput
          label="inputs.category"
          options={[
            { value: '', label: t('filters.allCategories') },
            ...categories.map(value => ({ value, label: value }))
          ]}
          value={filters.category}
          onChange={category => updateParams({ category })}
        />
        <SelectInput
          label="inputs.tags"
          options={[
            { value: '', label: t('filters.allTags') },
            ...tags.map(value => ({ value, label: value }))
          ]}
          value={filters.tag}
          onChange={tag => updateParams({ tag })}
        />
        <SelectInput
          label="filters.status"
          options={[
            { value: '', label: t('filters.allStatuses') },
            ...(
              ['up', 'down', 'error', 'stale', 'disabled', 'unknown'] as const
            ).map(value => ({ value, label: t(`status.${value}`) }))
          ]}
          value={filters.status}
          onChange={status => updateParams({ status })}
        />
      </Grid>
      <Flex align="center" gap="md" wrap="wrap">
        <Text color="muted">
          {t('filters.results', {
            count: visible.length,
            total: data.services.length
          })}
        </Text>
        {active > 0 && (
          <Button
            variant="plain"
            onClick={() =>
              updateParams({
                q: null,
                kind: null,
                device: null,
                category: null,
                tag: null,
                status: null
              })
            }
          >
            clearFilters
          </Button>
        )}
      </Flex>
      <Grid gap="md" templateCols={{ base: 1, md: 2, xl: 3 }}>
        {visible.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </Grid>
      {!visible.length && (
        <Card>
          <Text>
            {t(data.services.length ? 'messages.noMatches' : 'services.empty')}
          </Text>
        </Card>
      )}
    </Stack>
  )
}
