import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import UrpgAddonCard from '@/addons/urpg/AddonCard'
import NativeSectionSettings from '@/core/overlays/NativeSectionSettings'
import { useSettingsOverlay } from '@/core/overlays/SettingsOverlay'

import { ShopProvider, useShop } from './ShopProvider'
import ShopCard from './components/ShopCard'
import WidgetCatalog from './components/WidgetCatalog'
import './modules.css'

export default function Modules() {
  return (
    <ShopProvider>
      <Shop />
    </ShopProvider>
  )
}
function Shop() {
  const { t } = useTranslation('common.module-manager'),
    shop = useShop(),
    settings = useSettingsOverlay()
  const [section, setSection] = useState<'addons' | 'widgets' | 'sidebar'>(
    'addons'
  )
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('all'),
    [category, setCategory] = useState('all')
  const updates = shop.entries.filter(item => item.update).length
  const categories = [
    ...new Set(shop.entries.map(item => item.category))
  ].sort()
  const showUrpg =
    section === 'addons' &&
    status !== 'updates' &&
    category === 'all' &&
    (status !== 'enabled' || shop.active?.enabled_modules.includes('urpg')) &&
    (!search.trim() || 'urpg'.includes(search.trim().toLowerCase()))
  const entries = shop.entries.filter(
    item =>
      item.kind === (section === 'widgets' ? 'widget' : 'addon') &&
      (status === 'all' ||
        (status === 'installed' && !!item.installed) ||
        (status === 'updates' && item.update) ||
        (status === 'enabled' && item.enabled)) &&
      (category === 'all' || item.category === category) &&
      search
        .toLowerCase()
        .split(/\s+/)
        .every(term =>
          `${item.title} ${item.description}`.toLowerCase().includes(term)
        )
  )
  return (
    <Stack
      className="addon-manager shop"
      maxWidth="1240px"
      width="100%"
      p={{ base: 'md', md: 'xl' }}
      gap="lg"
    >
      <Flex justify="between" align="start" wrap="wrap" gap="md">
        <Stack gap="sm">
          <Text size="xs" color="muted" className="shop-eyebrow">
            MONOLITH / {t('shop.collection')}
          </Text>
          <Text as="h1" className="shop-title" weight="semibold">
            {t('title')}
          </Text>
          <Text color="muted" size="sm">
            {t('shop.description')}
          </Text>
        </Stack>
        <Button
          namespace={false}
          variant="secondary"
          icon="lucide:refresh-cw"
          loading={shop.pending === 'check'}
          disabled={
            !shop.canManage || !shop.catalog.data?.configured || !!shop.pending
          }
          onClick={() => void shop.check()}
        >
          {t('shop.checkUpdates')}
          {updates > 0 && ` (${updates})`}
        </Button>
      </Flex>
      <Flex
        className="shop-summary"
        p="md"
        r="md"
        align="center"
        gap="md"
        wrap="wrap"
      >
        <Icon icon="lucide:layers" />
        <Stack flex="1" gap="xs">
          <Text size="sm" weight="medium">
            {shop.active?.name ?? t('catalog.selectWorkspace')}
          </Text>
          <Text size="xs" color="muted">
            {t('shop.summary', {
              count: shop.entries.filter(item => item.installed).length,
              enabled: shop.entries.filter(item => item.enabled).length
            })}
          </Text>
        </Stack>
        <Button
          namespace={false}
          variant="plain"
          icon="lucide:settings-2"
          onClick={() => settings('general')}
        >
          {t('shop.workspaceSettings')}
        </Button>
      </Flex>
      <Flex
        className="shop-sections"
        role="group"
        aria-label={t('shop.sections')}
        gap="xs"
      >
        {(['addons', 'widgets', 'sidebar'] as const).map(key => (
          <Button
            key={key}
            namespace={false}
            variant="plain"
            aria-pressed={section === key}
            icon={
              key === 'addons'
                ? 'lucide:puzzle'
                : key === 'widgets'
                  ? 'lucide:layout-grid'
                  : 'lucide:panel-left'
            }
            onClick={() => {
              setSection(key)
              setStatus('all')
              setCategory('all')
            }}
          >
            {t(`shop.${key}`)}
          </Button>
        ))}
      </Flex>
      <Stack gap="sm">
        <Text as="h2" size="lg" weight="semibold">
          {t(`shop.${section}Title`)}
        </Text>
        <Text size="sm" color="muted">
          {t(`shop.${section}Help`)}
        </Text>
      </Stack>
      <Flex gap="sm" align="center" wrap="wrap">
        <Box className="addon-search" flex="1">
          <TextInput
            namespace={false}
            variant="plain"
            size="small"
            icon="lucide:search"
            placeholder={t('catalog.search')}
            aria-label={t('catalog.search')}
            value={search}
            onChange={setSearch}
          />
        </Box>
        {section !== 'sidebar' && (
          <>
            <Box
              as="select"
              className="addon-filter-select"
              aria-label={t('catalog.status')}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {['all', 'installed', 'enabled', 'updates'].map(value => (
                <option key={value} value={value}>
                  {t(`shop.${value}`)}
                  {value === 'updates' ? ` (${updates})` : ''}
                </option>
              ))}
            </Box>
            <Box
              as="select"
              className="addon-filter-select"
              aria-label={t('category')}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="all">{t('catalog.allCategories')}</option>
              {categories.map(value => (
                <option key={value}>{value}</option>
              ))}
            </Box>
          </>
        )}
      </Flex>
      {shop.error && (
        <Text role="alert" color="dangerous" size="sm">
          {shop.error}
        </Text>
      )}
      <Box className="addon-sr-only" role="status">
        {shop.notice}
      </Box>
      {!shop.catalog.data?.configured && (
        <Text color="muted" size="xs">
          {t('shop.unpublished')}
        </Text>
      )}
      {shop.catalog.data?.configured && !shop.canManage && (
        <Text color="muted" size="xs">
          {t('shop.hostAdmin')}
        </Text>
      )}
      {shop.modules.isPending ? (
        <Text role="status">{t('shop.loading')}</Text>
      ) : section === 'sidebar' ? (
        <Stack gap="xl">
          <WidgetCatalog search={search} sidebar />
          <NativeSectionSettings />
        </Stack>
      ) : (
        <>
          <Grid
            className="addon-catalog"
            templateCols={{ base: 1, md: 2, xl: 3 }}
            gap="md"
          >
            {entries.map(item => (
              <ShopCard key={`${shop.active?.id}:${item.id}`} item={item} />
            ))}
            {showUrpg && (
              <Box className="addon-card addon-special" data-addon="urpg">
                <UrpgAddonCard
                  disabled={!!shop.pending}
                  onBusyChange={shop.setExternalBusy}
                />
              </Box>
            )}
          </Grid>
          {section === 'widgets' && status === 'all' && category === 'all' && (
            <>
              <Text as="h2" size="lg" weight="semibold">
                {t('shop.includedWidgets')}
              </Text>
              <WidgetCatalog search={search} />
            </>
          )}
          {entries.length === 0 &&
            !showUrpg &&
            (section !== 'widgets' ||
              status !== 'all' ||
              category !== 'all') && (
              <Stack align="center" gap="sm" p="xl">
                <Icon icon="lucide:search" size="2em" />
                <Text color="muted">{t('catalog.noMatches')}</Text>
              </Stack>
            )}
        </>
      )}
      <Flex className="shop-footer" gap="md" wrap="wrap" py="lg">
        <Icon icon="lucide:package-check" />
        <Stack gap="xs">
          <Text size="sm" weight="medium">
            {t('shop.yourWorkspace')}
          </Text>
          <Text size="xs" color="muted">
            {t('shop.installHelp')}
          </Text>
        </Stack>
      </Flex>
    </Stack>
  )
}
