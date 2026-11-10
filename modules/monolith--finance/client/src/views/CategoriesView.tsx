import type { CSSProperties } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, Text } from '@monolith/ui'

import { decimalsOf } from '../../../core/currencies'
import {
  type Dec,
  add,
  isPositive,
  mulRound,
  toNumber
} from '../../../core/money'
import type { Category } from '../../../core/schemas'
import { headlineRate } from '../../../core/tax'
import { useFinance } from '../FinanceContext'
import { Meter } from '../charts/TrendArea'
import { periodLabel } from '../components/PeriodControl'
import { CategoryIcon, Segmented } from '../components/controls'
import { useEditors } from '../editors/useEditors'
import { budgetFactor } from '../utils/breakdown'
import { formatPercent } from '../utils/format'

export default function CategoriesView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const { data, params, updateParams, summary } = finance
  const kind = params.get('kind') === 'income' ? 'income' : 'expense'

  if (!data) return null

  const spent = new Map<string, Dec>()

  for (const row of summary?.categories ?? [])
    if (row.category_id) spent.set(row.category_id, row.amount)

  const all = data.categories.filter(category => category.kind === kind)
  const groups = all.filter(category => !category.parent_id)

  return (
    <>
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Segmented
          label={t('categories.kind')}
          options={[
            {
              value: 'expense',
              label: t('categories.expenses'),
              icon: 'tabler:arrow-down-right'
            },
            {
              value: 'income',
              label: t('categories.streams'),
              icon: 'tabler:arrow-up-right'
            }
          ]}
          value={kind}
          onChange={value =>
            updateParams({ kind: value === 'expense' ? null : value })
          }
        />
        <Flex align="center" gap="sm">
          <Text color="muted" size="sm">
            {periodLabel(finance.granularity, finance.range, finance.locale)}
          </Text>
          <Button
            icon="tabler:plus"
            onClick={() => editors.category(undefined, { kind })}
          >
            {kind === 'income' ? 'addStream' : 'addCategory'}
          </Button>
        </Flex>
      </Flex>
      {kind === 'income' && (
        <Text color="muted" size="sm">
          {t('categories.streamsHelp')}
        </Text>
      )}
      {!groups.length && (
        <Card align="start" gap="md">
          <Text color="muted">
            {t(kind === 'income' ? 'categories.noStreams' : 'categories.empty')}
          </Text>
        </Card>
      )}
      <div className="finance-card-grid" data-wide="">
        {groups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            index={index}
            spent={spent}
            subcategories={all.filter(
              category => category.parent_id === group.id
            )}
          />
        ))}
      </div>
    </>
  )
}

function GroupCard({
  group,
  subcategories: children,
  spent,
  index
}: {
  group: Category
  subcategories: Category[]
  spent: Map<string, Dec>
  index: number
}) {
  const finance = useFinance()
  const { t } = useModuleTranslation()
  const editors = useEditors()

  const factor = budgetFactor(finance.granularity, finance.range)
  const places = decimalsOf(finance.base)
  const total = add(
    spent.get(group.id) ?? '0',
    ...children.map(child => spent.get(child.id) ?? '0')
  )
  const budgetSum = [
    group.budget,
    ...children.map(child => child.budget)
  ].filter((value): value is string => !!value)
  const budget = budgetSum.length
    ? mulRound(add('0', ...budgetSum), factor, places)
    : null
  const ratio =
    budget && isPositive(budget) ? toNumber(total) / toNumber(budget) : null
  const rule = group.tax_rule_id
    ? finance.rulesById.get(group.tax_rule_id)
    : undefined

  return (
    <Card
      className="finance-rise"
      data-archived={group.archived || undefined}
      gap="sm"
      style={{ '--i': index } as CSSProperties}
    >
      <Flex align="center" gap="sm" justify="between">
        <Flex align="center" gap="sm" minWidth="0">
          <CategoryIcon
            color={group.color}
            icon={group.icon || 'tabler:folder'}
            size={40}
          />
          <Stack gap="none" minWidth="0">
            <Text weight="semibold">{group.name}</Text>
            <Text color="muted" size="xs">
              {[
                rule ? `${rule.name} · ${headlineRate(rule)}` : '',
                group.archived ? t('labels.archived') : ''
              ]
                .filter(Boolean)
                .join(' · ') ||
                t('categories.subcount', { count: children.length })}
            </Text>
          </Stack>
        </Flex>
        <Flex align="center" gap="xs">
          <Text className="finance-figure" weight="semibold">
            {finance.money(total)}
          </Text>
          <Button
            aria-label={t('buttons.editCategory', { name: group.name })}
            icon="tabler:pencil"
            variant="plain"
            onClick={() => editors.category(group)}
          />
        </Flex>
      </Flex>
      {ratio !== null && (
        <Flex align="center" gap="sm">
          <Meter
            label={t('overview.budgetUsed', {
              share: formatPercent(ratio, finance.locale)
            })}
            ratio={ratio}
          />
          <Text color="muted" size="xs" whiteSpace="nowrap">
            {t('overview.ofBudget', {
              budget: finance.money(budget, { compact: true })
            })}
          </Text>
        </Flex>
      )}
      {children.length > 0 && (
        <ul className="finance-sublist">
          {children.map(child => (
            <li key={child.id}>
              <button
                className="finance-subrow"
                data-archived={child.archived || undefined}
                type="button"
                onClick={() => editors.category(child)}
              >
                <CategoryIcon
                  color={child.color || group.color}
                  icon={child.icon || group.icon}
                  size={26}
                />
                <Text size="sm">{child.name}</Text>
                {child.budget && (
                  <Text color="muted" size="xs">
                    {t('categories.budgetShort', {
                      budget: finance.money(child.budget, { compact: true })
                    })}
                  </Text>
                )}
                <Text className="finance-figure" color="muted" size="sm">
                  {finance.money(spent.get(child.id) ?? '0')}
                </Text>
              </button>
            </li>
          ))}
        </ul>
      )}
      {group.kind === 'expense' && (
        <Button
          icon="tabler:plus"
          variant="plain"
          onClick={() =>
            editors.category(undefined, {
              kind: group.kind,
              parent_id: group.id
            })
          }
        >
          addSubcategory
        </Button>
      )}
    </Card>
  )
}
