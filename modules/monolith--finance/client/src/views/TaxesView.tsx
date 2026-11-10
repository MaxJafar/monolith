import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import {
  type Dec,
  add,
  isPositive,
  isZero,
  sub,
  toNumber
} from '../../../core/money'
import { type TaxRule, taxRuleInputSchema } from '../../../core/schemas'
import { headlineRate } from '../../../core/tax'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { bucketLabels } from '../components/PeriodControl'
import { CategoryIcon, Loading } from '../components/controls'
import { StatTile } from '../components/figures'
import { useEditors } from '../editors/useEditors'
import { rollUp } from '../utils/breakdown'
import { formatPercent } from '../utils/format'
import { buildSetup } from '../utils/presets'

export default function TaxesView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()
  const [year, setYear] = useState(Number(finance.today.slice(0, 4)))

  const { data, ownerId, money, locale } = finance
  const input = {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    bucket: 'month' as const
  }
  const query = useQuery(
    workspaceAPI.summary.input(input).queryOptions({
      queryKey: [
        ...workspaceAPI.summary.key,
        ownerId,
        input.from,
        input.to,
        input.bucket,
        null
      ],
      enabled: !!ownerId,
      placeholderData: keepPreviousData
    })
  )
  const summary = query.data

  if (!data) return null

  const rules = data.tax_rules
  const presets = buildSetup(t, {
    base: finance.base,
    currencies: [],
    accounts: false,
    categories: false,
    taxes: true,
    wishlists: false
  }).tax_rules.filter(preset => !rules.some(rule => rule.name === preset.name))

  async function addPresets() {
    await finance.run(async () => {
      for (const { key: _key, ...preset } of presets)
        await workspaceAPI.taxRules.save.mutate(
          taxRuleInputSchema.parse(preset)
        )
    })
  }

  return (
    <>
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Flex align="center" gap="xs">
          <Button
            aria-label={t('period.previous')}
            icon="tabler:chevron-left"
            variant="plain"
            onClick={() => setYear(year - 1)}
          />
          <Text className="finance-period-label" weight="semibold">
            {t('taxes.yearTitle', { year })}
          </Text>
          <Button
            aria-label={t('period.next')}
            icon="tabler:chevron-right"
            variant="plain"
            onClick={() => setYear(year + 1)}
          />
        </Flex>
        <Flex gap="sm" wrap="wrap">
          {presets.length > 0 && (
            <Button
              icon="tabler:sparkles"
              loading={finance.pending}
              variant="secondary"
              onClick={() => void addPresets()}
            >
              addTaxPresets
            </Button>
          )}
          <Button icon="tabler:plus" onClick={() => editors.rule()}>
            addRule
          </Button>
        </Flex>
      </Flex>

      {!summary ? (
        <Loading label={t('loading')} />
      ) : (
        <>
          <div className="finance-tiles">
            <StatTile
              format={v => money(v)}
              icon="tabler:file-invoice"
              index={0}
              label={t('taxes.incomeTax')}
              tone="accent"
              value={summary.totals.income_tax}
            >
              <Text color="muted" size="xs">
                {isPositive(summary.totals.income_gross)
                  ? t('taxes.effective', {
                      rate: formatPercent(
                        toNumber(summary.totals.income_tax) /
                          toNumber(summary.totals.income_gross),
                        locale,
                        1
                      )
                    })
                  : t('taxes.none')}
              </Text>
            </StatTile>
            <StatTile
              format={v => money(v)}
              icon="tabler:building-bank"
              index={1}
              label={t('taxes.withheld')}
              tone="neutral"
              value={summary.totals.tax_withheld}
            >
              <Text color="muted" size="xs">
                {t('taxes.withheldHelp')}
              </Text>
            </StatTile>
            <StatTile
              format={v => money(v)}
              icon="tabler:alert-triangle"
              index={2}
              label={t('taxes.reserve')}
              tone="expense"
              value={summary.totals.tax_reserve}
            >
              <Text color="muted" size="xs">
                {t('taxes.reserveHelp')}
              </Text>
            </StatTile>
            <StatTile
              format={v => money(v)}
              icon="tabler:receipt-tax"
              index={3}
              label={t('taxes.vat')}
              tone="net"
              value={summary.totals.vat}
            >
              <Text color="muted" size="xs">
                {isPositive(summary.totals.expense)
                  ? t('taxes.vatShare', {
                      share: formatPercent(
                        toNumber(summary.totals.vat) /
                          toNumber(summary.totals.expense),
                        locale,
                        1
                      )
                    })
                  : t('taxes.none')}
              </Text>
            </StatTile>
          </div>

          <div className="finance-pair">
            <Card gap="md">
              <Text as="h2" size="lg" weight="semibold">
                {t('taxes.byStream')}
              </Text>
              <TaxTable
                columns={[
                  t('taxes.stream'),
                  t('preview.gross'),
                  t('preview.tax'),
                  t('taxes.rate')
                ]}
                empty={t('overview.noIncome')}
                rows={rollUp(
                  finance,
                  summary,
                  'income',
                  '1',
                  t('labels.uncategorized')
                ).map(stream => ({
                  key: stream.id,
                  icon: stream.icon,
                  color: stream.color,
                  label: stream.label,
                  cells: [
                    money(stream.gross),
                    money(stream.tax),
                    isPositive(stream.gross)
                      ? formatPercent(
                          toNumber(stream.tax) / toNumber(stream.gross),
                          locale,
                          1
                        )
                      : '—'
                  ]
                }))}
              />
            </Card>
            <Card gap="md">
              <Text as="h2" size="lg" weight="semibold">
                {t('taxes.vatByCategory')}
              </Text>
              <TaxTable
                columns={[
                  t('inputs.category'),
                  t('taxes.paid'),
                  t('preview.vat')
                ]}
                empty={t('taxes.noVat')}
                rows={rollUp(
                  finance,
                  summary,
                  'expense',
                  '1',
                  t('labels.uncategorized')
                )
                  .filter(group => !isZero(group.tax))
                  .map(group => ({
                    key: group.id,
                    icon: group.icon,
                    color: group.color,
                    label: group.label,
                    cells: [money(group.amount), money(group.tax)]
                  }))}
              />
            </Card>
          </div>

          <Card gap="md">
            <Text as="h2" size="lg" weight="semibold">
              {t('taxes.monthly')}
            </Text>
            <div className="finance-table-scroll">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th scope="col">{t('charts.period')}</th>
                    <th scope="col">{t('series.income')}</th>
                    <th scope="col">{t('preview.tax')}</th>
                    <th scope="col">{t('series.expense')}</th>
                    <th scope="col">{t('series.net')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.buckets.map(bucket => (
                    <tr key={bucket.start}>
                      <th scope="row">
                        {bucketLabels(bucket.start, 'month', locale).detail}
                      </th>
                      <td>{money(bucket.income)}</td>
                      <td>{money(bucket.tax)}</td>
                      <td>{money(bucket.expense)}</td>
                      <td>{money(bucket.net, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{t('taxes.total')}</th>
                    <td>{money(summary.totals.income_received)}</td>
                    <td>
                      {money(
                        add(summary.totals.income_tax, summary.totals.vat)
                      )}
                    </td>
                    <td>{money(summary.totals.expense)}</td>
                    <td>
                      {money(
                        sub(
                          summary.totals.income_received,
                          summary.totals.expense
                        ),
                        { sign: true }
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      <Stack gap="sm">
        <Text as="h2" size="lg" weight="semibold">
          {t('taxes.rules')}
        </Text>
        <Text color="muted" size="sm">
          {t('taxes.rulesHelp')}
        </Text>
        <div className="finance-card-grid">
          {rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
        {!rules.length && <Text color="muted">{t('taxes.noRules')}</Text>}
      </Stack>
    </>
  )
}

function TaxTable({
  columns,
  rows,
  empty
}: {
  columns: string[]
  rows: {
    key: string
    icon: string
    color: string
    label: string
    cells: string[]
  }[]
  empty: string
}) {
  if (!rows.length)
    return (
      <Text color="muted" size="sm">
        {empty}
      </Text>
    )

  return (
    <div className="finance-table-scroll">
      <table className="finance-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <th scope="row">
                <Flex align="center" gap="sm">
                  <CategoryIcon color={row.color} icon={row.icon} size={24} />
                  {row.label}
                </Flex>
              </th>
              {row.cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RuleCard({ rule }: { rule: TaxRule }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const used = finance.data!.categories.filter(
    category => category.tax_rule_id === rule.id
  )
  const describe = (up: Dec | null, rate: string, from: Dec) =>
    up === null
      ? t('taxes.above', {
          from: finance.native(from, finance.base, { trim: true }),
          rate
        })
      : t('taxes.upTo', {
          up: finance.native(up, finance.base, { trim: true }),
          rate
        })

  return (
    <button
      className="finance-rule"
      type="button"
      onClick={() => editors.rule(rule)}
    >
      <Flex align="center" gap="sm" justify="between">
        <Flex align="center" gap="sm" minWidth="0">
          <CategoryIcon
            color={rule.kind === 'vat' ? '#2a78d6' : '#eda100'}
            icon={
              rule.kind === 'vat' ? 'tabler:receipt-tax' : 'tabler:file-invoice'
            }
            size={32}
          />
          <Text weight="semibold">{rule.name}</Text>
        </Flex>
        <Text className="finance-figure" weight="semibold">
          {headlineRate(rule)}
        </Text>
      </Flex>
      <Text color="muted" size="xs">
        {rule.kind === 'vat'
          ? t(rule.inclusive ? 'taxes.vatIncluded' : 'taxes.vatOnTop')
          : t(rule.withheld ? 'taxes.isWithheld' : 'taxes.isSelfPaid')}
        {used.length
          ? ` · ${t('taxes.usedBy', { names: used.map(category => category.name).join(', ') })}`
          : ''}
      </Text>
      {rule.kind === 'income' &&
        rule.components.map(component => {
          let from = '0'

          return (
            <Stack key={component.label} gap="none">
              <Text size="xs" weight="medium">
                {component.label}
              </Text>
              <Text color="muted" size="xs">
                {component.brackets
                  .map(bracket => {
                    const text = describe(bracket.up_to, bracket.rate, from)

                    from = bracket.up_to ?? from

                    return text
                  })
                  .join(' · ')}
              </Text>
            </Stack>
          )
        })}
    </button>
  )
}
