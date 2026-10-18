import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { checkSignOutGuards } from '@monolith/api'
import {
  Box,
  Button,
  Flex,
  FloatingPopover,
  Icon,
  Stack,
  Switch,
  Text
} from '@monolith/ui'

import { type ShopEntry, useShop } from '../ShopProvider'
import InstallProgress from './InstallProgress'
import WidgetPicker from './WidgetPicker'

export default function ShopCard({ item }: { item: ShopEntry }) {
  const { t } = useTranslation('common.module-manager'),
    shop = useShop()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const job = item.job,
    working = !!job && !['complete', 'failed'].includes(job.phase)
  const compatible =
    item.release?.hostVersion === shop.catalog.data?.hostVersion
  const activated =
    job?.phase === 'complete' && job.version === item.release?.version
  const installable =
    !!item.release && !activated && (!item.installed || item.update)
  return (
    <Stack
      as="article"
      className="addon-card shop-card"
      data-addon={item.slug}
      data-enabled={item.enabled}
      p="lg"
      gap="md"
      minWidth="0"
    >
      <Flex justify="between" align="center" gap="sm">
        <Flex className="addon-icon" centered width="3rem" height="3rem" r="lg">
          <Icon icon={item.icon} size="1.5rem" />
        </Flex>
        <Text size="xs" className="addon-tag">
          {t(item.kind === 'widget' ? 'shop.widget' : 'shop.addon')}
        </Text>
      </Flex>
      <Stack gap="sm" flex="1">
        <Text as="h2" size="lg" weight="semibold">
          {item.title}
        </Text>
        <Text as="p" color="muted" size="sm" leading="relaxed">
          {item.description}
        </Text>
      </Stack>
      <Flex gap="sm" wrap="wrap" align="center">
        <Text size="xs" color="muted">
          {item.category}
        </Text>
        <Text size="xs" color="muted">
          v{item.release?.version ?? item.installed}
        </Text>
        {item.update && (
          <Text size="xs" className="shop-update">
            {t('shop.updateAvailable')}
          </Text>
        )}
      </Flex>
      <Flex className="shop-card-actions" align="center" gap="sm" wrap="wrap">
        {installable ? (
          <Button
            namespace={false}
            icon="lucide:download"
            variant="secondary"
            disabled={
              !shop.canManage || !compatible || !!shop.pending || working
            }
            loading={working || shop.pending === item.id}
            onClick={() => void shop.install(item)}
          >
            {t(item.update ? 'shop.update' : 'shop.install')}
          </Button>
        ) : (
          <Text size="xs" color="muted">
            <Icon icon="lucide:check" /> {t('shop.installed')}
          </Text>
        )}
        <Button
          namespace={false}
          variant="plain"
          aria-label={t('shop.detailsFor', { name: item.title })}
          onClick={event => setAnchor(event.currentTarget)}
        >
          {t('shop.details')}
        </Button>
        {item.installed && (
          <Flex className="addon-toggle shop-enable" gap="sm" align="center">
            <Switch
              value={item.enabled}
              disabled={!shop.canEnable || !!shop.pending || working}
              onChange={() => void shop.toggle(item)}
              aria-label={t('catalog.toggle', { name: item.title })}
            />
          </Flex>
        )}
      </Flex>
      {item.enabled &&
        (item.kind === 'widget' ? (
          <WidgetPicker moduleId={item.id} />
        ) : (
          <Button
            as={Link}
            namespace={false}
            variant="plain"
            justify="start"
            icon="lucide:arrow-up-right"
            to={`/${item.slug === 'blog' ? 'journal' : item.slug}?workspace=${shop.active?.id ?? ''}`}
          >
            {t('catalog.open')}
          </Button>
        ))}
      {installable && !compatible && (
        <Text size="xs" color="muted">
          {t('shop.requiresHost', { version: item.release?.hostVersion })}
        </Text>
      )}
      {job && <InstallProgress job={job} />}
      {job?.phase === 'complete' && (
        <Button
          namespace={false}
          variant="secondary"
          onClick={async () => {
            await checkSignOutGuards()
            window.location.reload()
          }}
        >
          {t('shop.reload')}
        </Button>
      )}
      {anchor && (
        <FloatingPopover
          anchor={anchor}
          label={item.title}
          onClose={() => setAnchor(null)}
        >
          <Stack gap="md" className="shop-detail">
            <Flex align="center" gap="sm">
              <Icon icon={item.icon} />
              <Text weight="semibold">{item.title}</Text>
            </Flex>
            <Text size="sm" color="muted">
              {item.description}
            </Text>
            <Text size="sm">
              {t('shop.installedVersion')}:{' '}
              {item.installed ?? t('shop.notInstalled')}
            </Text>
            {item.release ? (
              <>
                <Text size="sm">
                  {t('shop.downloadSize')}:{' '}
                  {(item.release.bytes / 1024 / 1024).toFixed(1)} MB
                </Text>
                <Text size="sm">
                  {t('shop.requiresHost', {
                    version: item.release.hostVersion
                  })}
                </Text>
                <Text size="sm" whiteSpace="pre-wrap">
                  {item.release.notes || t('shop.noNotes')}
                </Text>
              </>
            ) : (
              <Text size="sm" color="muted">
                {t('shop.localPackage')}
              </Text>
            )}
            <Box className="shop-detail-note" p="sm" r="sm">
              <Text size="xs" color="muted">
                {t('shop.installHelp')}
              </Text>
            </Box>
          </Stack>
        </FloatingPopover>
      )}
    </Stack>
  )
}
