import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  DateInput,
  Flex,
  NumberInput,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { computeTransaction } from '../../../core/compute'
import { decimalsOf } from '../../../core/currencies'
import { isPositive, mulRound } from '../../../core/money'
import { perYear } from '../../../core/schedule'
import type { Recurring } from '../../../core/schemas'
import { defaultBasis } from '../../../core/tax'
import { workspaceAPI } from '../../manifest'
import {
  AmountInput,
  Segmented,
  SelectInput,
  SwitchRow
} from '../components/controls'
import {
  accountOptions,
  categoryOptions,
  currencyOptions,
  kindIcons,
  ruleOptions
} from '../utils/options'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'
import { fromCivil, toCivil } from './TransactionEditor'

export function RecurringEditor({
  data: { finance, item, preset },
  onClose
}: {
  data: EditorData<Recurring, { kind?: 'income' | 'expense' }>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const snapshot = finance.data!
  const defaultAccount =
    snapshot.settings.default_account_id ??
    snapshot.accounts.find(account => !account.archived)?.id ??
    ''
  const [draft, setDraft] = useState({
    kind: item?.kind ?? preset?.kind ?? 'expense',
    title: item?.title ?? '',
    account_id: item?.account_id ?? defaultAccount,
    category_id: item?.category_id ?? null,
    amount: item?.amount ?? (null as string | null),
    currency:
      item?.currency ??
      finance.accountsById.get(defaultAccount)?.currency ??
      finance.base,
    tax_rule_id: item?.tax_rule_id ?? null,
    tax_basis: item?.tax_basis ?? 'gross',
    cadence: item?.cadence ?? 'monthly',
    interval: item?.interval ?? 1,
    start_on: item?.start_on ?? finance.today,
    end_on: item?.end_on ?? null,
    auto_post: item?.auto_post ?? true,
    active: item?.active ?? true,
    notes: item?.notes ?? ''
  })
  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const account = finance.accountsById.get(draft.account_id)
  const rule = finance.ruleCore(draft.tax_rule_id)

  let each = null

  if (draft.amount && isPositive(draft.amount) && account && finance.book)
    try {
      each = computeTransaction(
        {
          kind: draft.kind,
          entered_amount: draft.amount,
          entered_currency: draft.currency,
          account_currency: account.currency,
          tax_basis: draft.tax_basis,
          rule
        },
        finance.book
      )
    } catch {
      each = null
    }

  const yearly = each
    ? mulRound(
        each.base_amount,
        perYear(draft.cadence, draft.interval),
        decimalsOf(finance.base)
      )
    : null

  return (
    <EditorShell
      wide
      canSave={!!draft.title.trim() && !!draft.amount && !!account}
      icon={
        draft.kind === 'income'
          ? 'tabler:calendar-dollar'
          : 'tabler:calendar-repeat'
      }
      title={t(item ? 'editor.editPlan' : `editor.newPlan.${draft.kind}`)}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.plan.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.plan.save.mutate({
            ...draft,
            title: draft.title.trim(),
            amount: draft.amount ?? '0',
            ...(item ? { id: item.id, expected_updated: item.updated } : {})
          })
        )
      }
    >
      <Segmented
        label={t('inputs.kind')}
        options={(['expense', 'income'] as const).map(value => ({
          value,
          label: t(`kinds.${value}`),
          icon: kindIcons[value]
        }))}
        value={draft.kind}
        onChange={kind => set({ kind, category_id: null, tax_rule_id: null })}
      />
      <Fields>
        <TextInput
          autoFocus
          required
          icon="tabler:file-description"
          label="title"
          placeholder={t(`placeholders.plan.${draft.kind}`)}
          value={draft.title}
          onChange={title => set({ title })}
        />
        <AmountInput
          required
          label="amount"
          suffix={draft.currency}
          value={draft.amount}
          onChange={amount => set({ amount })}
        />
        <SelectInput
          icon="tabler:currency"
          label="currency"
          options={currencyOptions(finance, [draft.currency])}
          value={draft.currency}
          onChange={currency => set({ currency })}
        />
        <SelectInput
          label="account"
          options={accountOptions(finance)}
          value={draft.account_id}
          onChange={account_id => set({ account_id })}
        />
        <SelectInput
          label={draft.kind === 'income' ? 'incomeStream' : 'category'}
          options={categoryOptions(
            finance,
            draft.kind,
            t('labels.uncategorized')
          )}
          value={draft.category_id ?? ''}
          onChange={id => {
            const category = finance.categoriesById.get(id)
            const parent = category?.parent_id
              ? finance.categoriesById.get(category.parent_id)
              : undefined
            const ruleId =
              draft.tax_rule_id ??
              category?.tax_rule_id ??
              parent?.tax_rule_id ??
              null

            set({
              category_id: id || null,
              tax_rule_id: ruleId,
              tax_basis: defaultBasis(finance.ruleCore(ruleId))
            })
          }}
        />
        <SelectInput
          icon="tabler:receipt-tax"
          label="taxRule"
          options={ruleOptions(finance, draft.kind, t('labels.noTax'))}
          value={draft.tax_rule_id ?? ''}
          onChange={id =>
            set({
              tax_rule_id: id || null,
              tax_basis: defaultBasis(finance.ruleCore(id))
            })
          }
        />
        <SelectInput
          icon="tabler:repeat"
          label="cadence"
          options={(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(
            value => ({
              value,
              label: t(`cadence.${value}`)
            })
          )}
          value={draft.cadence}
          onChange={cadence => set({ cadence })}
        />
        <NumberInput
          icon="tabler:arrows-horizontal"
          label="every"
          max={52}
          min={1}
          value={draft.interval}
          onChange={interval =>
            set({
              interval: Math.max(1, Math.min(52, Math.round(interval || 1)))
            })
          }
        />
        <DateInput
          required
          icon="tabler:calendar"
          label="startDate"
          value={fromCivil(draft.start_on)}
          onChange={value => value && set({ start_on: toCivil(value) })}
        />
        <DateInput
          icon="tabler:calendar-off"
          label="endDate"
          value={fromCivil(draft.end_on)}
          onChange={value => set({ end_on: value ? toCivil(value) : null })}
        />
      </Fields>
      {rule && (
        <Segmented
          label={t('inputs.taxBasis')}
          options={(['gross', 'net'] as const).map(value => ({
            value,
            label: t(`basis.${rule.kind}.${value}`)
          }))}
          size="small"
          value={draft.tax_basis}
          onChange={tax_basis => set({ tax_basis })}
        />
      )}
      <SwitchRow
        description="help.autoPost"
        label="inputs.autoPost"
        value={draft.auto_post}
        onChange={auto_post => set({ auto_post })}
      />
      <SwitchRow
        description="help.active"
        label="inputs.active"
        value={draft.active}
        onChange={active => set({ active })}
      />
      {each && (
        <Stack aria-live="polite" className="finance-preview" gap="xs">
          <Flex justify="between">
            <Text color="muted" size="sm">
              {t(
                draft.kind === 'income'
                  ? 'preview.creditedEach'
                  : 'preview.chargedEach'
              )}
            </Text>
            <Text className="finance-figure" size="sm" weight="medium">
              {finance.native(each.amount, account!.currency)}
            </Text>
          </Flex>
          {each.tax_amount !== '0' && (
            <Flex justify="between">
              <Text color="muted" size="sm">
                {t(draft.kind === 'income' ? 'preview.tax' : 'preview.vat')}
              </Text>
              <Text className="finance-figure" size="sm">
                {finance.native(each.tax_amount, account!.currency)}
              </Text>
            </Flex>
          )}
          <Flex justify="between">
            <Text color="muted" size="sm">
              {t('preview.perYear')}
            </Text>
            <Text className="finance-figure" size="sm" weight="semibold">
              {finance.money(yearly)}
            </Text>
          </Flex>
        </Stack>
      )}
      <TextAreaInput
        icon="tabler:notes"
        label="notes"
        placeholder=""
        value={draft.notes}
        onChange={notes => set({ notes })}
      />
    </EditorShell>
  )
}
