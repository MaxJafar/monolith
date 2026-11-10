import type { CSSProperties } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import { type Dec, add, isNegative, neg, toNumber } from '../../../core/money'
import { type Account, accountKinds } from '../../../core/schemas'
import { useFinance } from '../FinanceContext'
import { CategoryIcon } from '../components/controls'
import { AnimatedValue } from '../components/figures'
import { useEditors } from '../editors/useEditors'
import { formatInstant, formatPercent } from '../utils/format'
import { accountIcons } from '../utils/options'

export default function AccountsView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const { data, money } = finance

  if (!data) return null

  const active = data.accounts.filter(account => !account.archived)
  const archived = data.accounts.filter(account => account.archived)
  const counted = active.filter(
    account => account.include_in_net_worth && account.base_balance !== null
  )
  const assets = add(
    '0',
    ...counted
      .filter(a => !isNegative(a.base_balance!))
      .map(a => a.base_balance!)
  )
  const debts = add(
    '0',
    ...counted
      .filter(a => isNegative(a.base_balance!))
      .map(a => neg(a.base_balance!))
  )
  const worth = add(assets, neg(debts))
  const whole = toNumber(assets) + toNumber(debts) || 1
  const unpriced = active.filter(account => account.base_balance === null)

  return (
    <>
      <Card className="finance-rise" gap="md">
        <Flex align="center" gap="md" justify="between" wrap="wrap">
          <Stack gap="xs">
            <Text color="muted" size="sm">
              {t('overview.netWorth')}
            </Text>
            <AnimatedValue
              className="finance-hero-value"
              format={value => money(value)}
              value={worth}
            />
          </Stack>
          <Flex gap="sm" wrap="wrap">
            <Button
              icon="tabler:arrows-exchange"
              variant="secondary"
              onClick={() =>
                editors.transaction(undefined, { kind: 'transfer' })
              }
            >
              transfer
            </Button>
            <Button icon="tabler:plus" onClick={() => editors.account()}>
              addAccount
            </Button>
          </Flex>
        </Flex>
        <div
          aria-label={t('accounts.split', {
            assets: money(assets),
            debts: money(debts)
          })}
          className="finance-split finance-split-tall"
          role="img"
        >
          <span
            data-series="net"
            style={{ flexGrow: toNumber(assets) / whole }}
          />
          {toNumber(debts) > 0 && (
            <span
              data-series="expense"
              style={{ flexGrow: toNumber(debts) / whole }}
            />
          )}
        </div>
        <Flex className="finance-legend" gap="lg" wrap="wrap">
          <span data-series="net">
            {t('accounts.assets')} · {money(assets)}
          </span>
          <span data-series="expense">
            {t('accounts.debts')} · {money(debts)}
          </span>
        </Flex>
        {unpriced.length > 0 && (
          <Text color="muted" size="sm">
            {t('accounts.unpriced', {
              codes: [
                ...new Set(unpriced.map(account => account.currency))
              ].join(', ')
            })}
          </Text>
        )}
      </Card>

      {!active.length && (
        <Card align="start" gap="md">
          <Text color="muted">{t('accounts.empty')}</Text>
          <Button icon="tabler:plus" onClick={() => editors.account()}>
            addAccount
          </Button>
        </Card>
      )}

      {accountKinds.map(kind => {
        const items = active.filter(account => account.kind === kind)

        if (!items.length) return null

        const subtotal = add(
          '0',
          ...items.map(account => account.base_balance ?? '0')
        )

        return (
          <Stack key={kind} gap="sm">
            <Flex align="baseline" justify="between">
              <Text as="h2" size="lg" weight="semibold">
                {t(`accountKinds.${kind}`)}
              </Text>
              <Text className="finance-figure" color="muted" size="sm">
                {money(subtotal)}
              </Text>
            </Flex>
            <div className="finance-card-grid">
              {items.map((account, index) => (
                <AccountCard key={account.id} account={account} index={index} />
              ))}
            </div>
          </Stack>
        )
      })}

      {archived.length > 0 && (
        <details className="finance-archived">
          <summary>
            {t('accounts.archived', { count: archived.length })}
          </summary>
          <div className="finance-card-grid">
            {archived.map((account, index) => (
              <AccountCard key={account.id} account={account} index={index} />
            ))}
          </div>
        </details>
      )}
    </>
  )
}

function AccountCard({ account, index }: { account: Account; index: number }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const rate = finance.book?.entries[account.currency]
  const balance: Dec = account.balance

  return (
    <article
      className="finance-account finance-rise"
      data-negative={isNegative(balance) || undefined}
      style={
        {
          '--i': index,
          '--accent': account.color || 'var(--fin-net)'
        } as CSSProperties
      }
    >
      <Flex align="start" gap="md" justify="between">
        <Flex align="center" gap="sm" minWidth="0">
          <CategoryIcon
            color={account.color}
            icon={account.icon || accountIcons[account.kind]!}
            size={40}
          />
          <Stack gap="none" minWidth="0">
            <Text overflowWrap="anywhere" weight="semibold">
              {account.name}
            </Text>
            <Text color="muted" size="xs">
              {[
                account.institution,
                account.currency,
                account.interest_rate
                  ? t('accounts.interest', {
                      rate: formatPercent(
                        Number(account.interest_rate) / 100,
                        finance.locale,
                        2
                      )
                    })
                  : ''
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Stack>
        </Flex>
        <Button
          aria-label={t('buttons.editAccount', { name: account.name })}
          icon="tabler:pencil"
          variant="plain"
          onClick={() => editors.account(account)}
        />
      </Flex>
      <AnimatedValue
        className="finance-account-balance"
        format={value => finance.native(value, account.currency)}
        value={balance}
      />
      {account.currency !== finance.display && (
        <Text color="muted" size="sm">
          {account.base_balance === null
            ? t('accounts.noRate')
            : `≈ ${finance.money(account.base_balance)}`}
        </Text>
      )}
      <Flex align="center" gap="xs" justify="between" wrap="wrap">
        <Text color="muted" size="xs">
          {t('labels.count', { count: account.transactions })}
          {rate?.market_at && rate.source === 'market'
            ? ` · ${t('accounts.rateAt', { at: formatInstant(rate.market_at, finance.locale) })}`
            : ''}
          {rate?.source === 'custom' ? ` · ${t('rates.custom')}` : ''}
        </Text>
        <Flex gap="xs">
          <Button
            aria-label={t('buttons.addExpense')}
            icon="tabler:minus"
            variant="plain"
            onClick={() =>
              editors.transaction(undefined, {
                kind: 'expense',
                account_id: account.id
              })
            }
          />
          <Button
            aria-label={t('buttons.addIncome')}
            icon="tabler:plus"
            variant="plain"
            onClick={() =>
              editors.transaction(undefined, {
                kind: 'income',
                account_id: account.id
              })
            }
          />
          <Button
            aria-label={t('buttons.transfer')}
            icon="tabler:arrows-exchange"
            variant="plain"
            onClick={() =>
              editors.transaction(undefined, {
                kind: 'transfer',
                account_id: account.id
              })
            }
          />
        </Flex>
      </Flex>
    </article>
  )
}
