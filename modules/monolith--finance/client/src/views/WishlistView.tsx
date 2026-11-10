import type { CSSProperties } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Icon, Stack, Switch, Text } from '@monolith/ui'

import { add, div, isPositive, isZero, toNumber } from '../../../core/money'
import type { WishlistItem, WishlistList } from '../../../core/schemas'
import { headlineRate } from '../../../core/tax'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { CategoryIcon, Segmented } from '../components/controls'
import { AnimatedValue } from '../components/figures'
import { useEditors } from '../editors/useEditors'
import { projection } from '../utils/breakdown'
import { formatDate } from '../utils/format'

type Filter = 'wanted' | 'purchased' | 'all'

export default function WishlistView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const { data, params, updateParams, money } = finance
  const requested = params.get('show')
  const filter: Filter =
    requested === 'purchased' || requested === 'all' ? requested : 'wanted'

  if (!data) return null

  const wanted = data.wishes.filter(item => item.status === 'wanted')
  const bought = data.wishes.filter(
    item =>
      item.status === 'purchased' &&
      item.purchased_on?.slice(0, 4) === finance.today.slice(0, 4)
  )
  const wantedTotal = add('0', ...wanted.map(item => item.base_total ?? '0'))
  const boughtTotal = add('0', ...bought.map(item => item.base_total ?? '0'))
  const plan = projection(finance, Number(finance.today.slice(0, 4)))
  const monthly =
    plan && isPositive(plan.totals.net) ? div(plan.totals.net, '12', 2) : null
  const visible = data.wishes.filter(
    item => filter === 'all' || item.status === filter
  )
  const lists: (WishlistList | null)[] = [
    ...data.lists.filter(list => !list.archived),
    null
  ]

  return (
    <>
      <Card className="finance-rise" gap="md">
        <Flex align="start" gap="lg" justify="between" wrap="wrap">
          <Stack gap="xs">
            <Text color="muted" size="sm">
              {t('wishlist.total')}
            </Text>
            <AnimatedValue
              className="finance-hero-value"
              format={value => money(value)}
              value={wantedTotal}
            />
            <Text color="muted" size="sm">
              {[
                t('wishlist.itemsWanted', { count: wanted.length }),
                monthly && isPositive(wantedTotal)
                  ? t('wishlist.monthsToAfford', {
                      count: Math.ceil(
                        toNumber(wantedTotal) / toNumber(monthly)
                      )
                    })
                  : '',
                !isZero(boughtTotal)
                  ? t('wishlist.boughtThisYear', { total: money(boughtTotal) })
                  : ''
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Stack>
          <Flex gap="sm" wrap="wrap">
            <Button
              icon="tabler:list"
              variant="secondary"
              onClick={() => editors.list()}
            >
              addList
            </Button>
            <Button icon="tabler:plus" onClick={() => editors.wish()}>
              addWish
            </Button>
          </Flex>
        </Flex>
        <Text color="muted" size="sm">
          {t('wishlist.help')}
        </Text>
      </Card>
      <Segmented
        label={t('wishlist.show')}
        options={(['wanted', 'purchased', 'all'] as const).map(value => ({
          value,
          label: t(`wishlist.filter.${value}`)
        }))}
        size="small"
        value={filter}
        onChange={value =>
          updateParams({ show: value === 'wanted' ? null : value })
        }
      />
      {lists.map(list => {
        const items = visible.filter(
          item => (item.list_id ?? null) === (list?.id ?? null)
        )

        if (!items.length && !list) return null

        const total = add(
          '0',
          ...items
            .filter(item => item.status === 'wanted')
            .map(item => item.base_total ?? '0')
        )

        return (
          <Stack key={list?.id ?? 'unsorted'} gap="sm">
            <Flex align="center" gap="sm" justify="between">
              <Flex align="center" gap="sm">
                <CategoryIcon
                  color={list?.color}
                  icon={list?.icon || 'tabler:inbox'}
                  size={32}
                />
                <Text as="h2" size="lg" weight="semibold">
                  {list?.name ?? t('labels.unsorted')}
                </Text>
                <Text className="finance-figure" color="muted" size="sm">
                  {money(total)}
                </Text>
              </Flex>
              <Flex gap="xs">
                {list && (
                  <Button
                    aria-label={t('buttons.editList', { name: list.name })}
                    icon="tabler:pencil"
                    variant="plain"
                    onClick={() => editors.list(list)}
                  />
                )}
                <Button
                  aria-label={t('buttons.addWish')}
                  icon="tabler:plus"
                  variant="plain"
                  onClick={() =>
                    editors.wish(undefined, { list_id: list?.id ?? null })
                  }
                />
              </Flex>
            </Flex>
            {items.length ? (
              <div className="finance-card-grid">
                {items.map((item, index) => (
                  <WishCard key={item.id} index={index} item={item} />
                ))}
              </div>
            ) : (
              <Text color="muted" size="sm">
                {t('wishlist.emptyList')}
              </Text>
            )}
          </Stack>
        )
      })}
    </>
  )
}

function WishCard({ item, index }: { item: WishlistItem; index: number }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const rule = item.tax_rule_id
    ? finance.rulesById.get(item.tax_rule_id)
    : undefined
  const bought = item.status === 'purchased'
  const canBuyNow = !!(
    item.account_id ?? finance.data?.settings.default_account_id
  )

  function toggle(next: boolean) {
    if (next && !canBuyNow) return editors.purchase(item)
    void finance.run(() =>
      workspaceAPI.wishlist.purchase.mutate({
        id: item.id,
        expected_updated: item.updated,
        purchased: next,
        account_id: null,
        category_id: null,
        occurred_on: next ? finance.today : null
      })
    )
  }

  const breakdown = [
    item.quantity > 1
      ? `${finance.native(item.price, item.currency)} × ${item.quantity}`
      : finance.native(item.price, item.currency),
    !isZero(item.shipping)
      ? t('wishlist.plusShipping', {
          value: finance.native(item.shipping, item.currency)
        })
      : '',
    rule && !isZero(item.tax)
      ? t(rule.inclusive ? 'wishlist.vatIncluded' : 'wishlist.plusVat', {
          rate: headlineRate(rule),
          value: finance.native(item.tax, item.currency)
        })
      : ''
  ].filter(Boolean)

  return (
    <article
      className="finance-wish finance-rise"
      data-bought={bought || undefined}
      data-priority={item.priority}
      style={{ '--i': index } as CSSProperties}
    >
      <Flex align="start" gap="sm" justify="between">
        <button
          className="finance-wish-main"
          type="button"
          onClick={() => editors.wish(item)}
        >
          <Flex align="center" gap="xs">
            {item.priority === 'high' && (
              <Icon aria-label={t('priority.high')} icon="tabler:flame" />
            )}
            <Text overflowWrap="anywhere" weight="semibold">
              {item.name}
            </Text>
          </Flex>
          <Text color="muted" size="xs">
            {breakdown.join(' ')}
          </Text>
        </button>
        <Flex align="center" gap="xs">
          <Text color="muted" size="xs">
            {t(bought ? 'wishlist.bought' : 'wishlist.buy')}
          </Text>
          <Switch
            aria-label={t('wishlist.toggle', { name: item.name })}
            disabled={finance.pending}
            value={bought}
            onChange={toggle}
          />
        </Flex>
      </Flex>
      <Flex align="end" gap="sm" justify="between" wrap="wrap">
        <Stack gap="none">
          <Text className="finance-wish-total" weight="semibold">
            {finance.native(item.total, item.currency)}
          </Text>
          {item.currency !== finance.display && (
            <Text color="muted" size="xs">
              {item.base_total === null
                ? t('accounts.noRate')
                : `≈ ${finance.money(item.base_total)}`}
            </Text>
          )}
        </Stack>
        <Flex align="center" gap="xs">
          {bought && item.purchased_on ? (
            <Text color="muted" size="xs">
              {t('wishlist.boughtOn', {
                date: formatDate(item.purchased_on, finance.locale)
              })}
            </Text>
          ) : item.target_on ? (
            <Text color="muted" size="xs">
              {t('wishlist.target', {
                date: formatDate(item.target_on, finance.locale)
              })}
            </Text>
          ) : null}
          {item.url && (
            <Button
              aria-label={t('wishlist.open', { name: item.name })}
              as="a"
              href={item.url}
              icon="tabler:external-link"
              rel="noopener noreferrer"
              target="_blank"
              variant="plain"
            />
          )}
        </Flex>
      </Flex>
    </article>
  )
}
