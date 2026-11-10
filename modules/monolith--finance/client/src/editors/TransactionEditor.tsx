import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  DateInput,
  Flex,
  Stack,
  Text,
  TextAreaInput,
  TextInput
} from '@monolith/ui'

import { computeTransaction } from '../../../core/compute'
import { isPositive } from '../../../core/money'
import type { Transaction } from '../../../core/schemas'
import { defaultBasis } from '../../../core/tax'
import { workspaceAPI } from '../../manifest'
import { AmountInput, Segmented, SelectInput } from '../components/controls'
import { formatRate } from '../utils/format'
import {
  accountOptions,
  categoryOptions,
  currencyOptions,
  kindIcons,
  ruleOptions
} from '../utils/options'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'

type Kind = Transaction['kind']

export type TransactionPreset = Partial<
  Pick<Transaction, 'kind' | 'account_id' | 'category_id' | 'occurred_on'>
>

export const toCivil = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const fromCivil = (value: string | null) => {
  if (!value) return null

  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number
  ]

  return new Date(year, month - 1, day)
}

export function TransactionEditor({
  data: { finance, item, preset },
  onClose
}: {
  data: EditorData<Transaction, TransactionPreset>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const snapshot = finance.data!
  const firstAccount =
    preset?.account_id ??
    snapshot.settings.default_account_id ??
    snapshot.accounts.find(account => !account.archived)?.id ??
    ''
  const [kind, setKind] = useState<Kind>(
    item?.kind ?? preset?.kind ?? 'expense'
  )

  const [accountId, setAccountId] = useState(item?.account_id ?? firstAccount)

  const account = finance.accountsById.get(accountId)

  const [toAccountId, setToAccountId] = useState(item?.to_account_id ?? '')

  const [categoryId, setCategoryId] = useState(
    item?.category_id ?? preset?.category_id ?? ''
  )
  const [amount, setAmount] = useState<string | null>(
    item?.entered_amount ?? null
  )
  const [currency, setCurrency] = useState(
    item?.entered_currency ?? account?.currency ?? finance.base
  )
  const [toAmount, setToAmount] = useState<string | null>(
    item?.to_amount ?? null
  )
  const [date, setDate] = useState(
    item?.occurred_on ?? preset?.occurred_on ?? finance.today
  )

  const [title, setTitle] = useState(item?.title ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [ruleId, setRuleId] = useState(item?.tax_rule_id ?? '')
  const [ruleTouched, setRuleTouched] = useState(!!item)
  const [basis, setBasis] = useState(item?.tax_basis ?? 'gross')
  const [basisTouched, setBasisTouched] = useState(!!item)

  const flow = kind === 'transfer' ? null : kind
  const rule = flow ? finance.ruleCore(ruleId) : null
  const target = finance.accountsById.get(toAccountId)

  function chooseRule(id: string) {
    setRuleId(id)
    if (!basisTouched) setBasis(defaultBasis(finance.ruleCore(id)))
  }

  function chooseCategory(id: string) {
    setCategoryId(id)
    if (ruleTouched) return

    const category = finance.categoriesById.get(id)
    const parent = category?.parent_id
      ? finance.categoriesById.get(category.parent_id)
      : undefined

    chooseRule(category?.tax_rule_id ?? parent?.tax_rule_id ?? '')
  }

  function chooseKind(next: Kind) {
    setKind(next)
    setCategoryId('')
    if (!ruleTouched) chooseRule('')
  }

  function chooseAccount(id: string) {
    const next = finance.accountsById.get(id)

    if (account && next && currency === account.currency)
      setCurrency(next.currency)
    setAccountId(id)
  }

  let preview: ReturnType<typeof computeTransaction> | null = null
  let previewError = ''

  if (amount && isPositive(amount) && account && finance.book)
    try {
      preview = computeTransaction(
        {
          kind,
          entered_amount: amount,
          entered_currency: currency,
          account_currency: account.currency,
          to_account_currency: target?.currency ?? null,
          to_amount: toAmount,
          tax_basis: basis,
          rule
        },
        finance.book
      )
    } catch (error) {
      previewError = error instanceof Error ? error.message : String(error)
    }

  const valid =
    !!amount &&
    isPositive(amount) &&
    !!account &&
    (kind !== 'transfer' || (!!target && target.id !== account.id)) &&
    !previewError

  const body = {
    kind,
    occurred_on: date,
    account_id: accountId,
    to_account_id: kind === 'transfer' ? toAccountId : null,
    category_id: kind === 'transfer' ? null : categoryId || null,
    title,
    notes,
    entered_amount: amount ?? '0',
    entered_currency: currency,
    to_amount: kind === 'transfer' && toAmount ? toAmount : null,
    tax_rule_id: kind === 'transfer' ? null : ruleId || null,
    tax_basis: basis,
    ...(item ? { id: item.id, expected_updated: item.updated } : {})
  }

  return (
    <EditorShell
      canSave={valid}
      deleteLabel={
        item?.wishlist_item_id ? t('messages.deleteWishPurchase') : undefined
      }
      icon={kindIcons[kind]}
      title={t(item ? 'editor.editTransaction' : `editor.new.${kind}`)}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.transactions.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () => workspaceAPI.transactions.save.mutate(body))
      }
    >
      <Segmented
        label={t('inputs.kind')}
        options={(['expense', 'income', 'transfer'] as const).map(value => ({
          value,
          label: t(`kinds.${value}`),
          icon: kindIcons[value]
        }))}
        value={kind}
        onChange={chooseKind}
      />
      <Fields>
        <AmountInput
          autoFocus
          required
          label="amount"
          suffix={currency}
          value={amount}
          onChange={setAmount}
        />
        <SelectInput
          icon="tabler:currency"
          label="currency"
          options={currencyOptions(finance, [
            currency,
            account?.currency ?? ''
          ])}
          value={currency}
          onChange={setCurrency}
        />
        <SelectInput
          label={kind === 'transfer' ? 'fromAccount' : 'account'}
          options={accountOptions(finance)}
          value={accountId}
          onChange={chooseAccount}
        />
        {kind === 'transfer' ? (
          <SelectInput
            label="toAccount"
            options={[
              {
                value: '',
                label: t('inputs.chooseAccount'),
                icon: 'tabler:circle-dashed'
              },
              ...accountOptions(finance, { exclude: accountId })
            ]}
            value={toAccountId}
            onChange={setToAccountId}
          />
        ) : (
          <SelectInput
            label={kind === 'income' ? 'incomeStream' : 'category'}
            options={categoryOptions(finance, kind, t('labels.uncategorized'))}
            value={categoryId}
            onChange={chooseCategory}
          />
        )}
        <DateInput
          required
          icon="tabler:calendar"
          label="date"
          value={fromCivil(date)}
          onChange={value => value && setDate(toCivil(value))}
        />
        <TextInput
          icon="tabler:file-description"
          label={kind === 'income' ? 'payer' : 'title'}
          placeholder={t(`placeholders.${kind}`)}
          value={title}
          onChange={setTitle}
        />
        {kind === 'transfer' &&
          target &&
          account &&
          target.currency !== account.currency && (
            <AmountInput
              label="received"
              suffix={target.currency}
              value={toAmount}
              onChange={setToAmount}
            />
          )}
        {flow && (
          <SelectInput
            icon="tabler:receipt-tax"
            label="taxRule"
            options={ruleOptions(finance, flow, t('labels.noTax'))}
            value={ruleId}
            onChange={id => {
              setRuleTouched(true)
              chooseRule(id)
            }}
          />
        )}
      </Fields>
      {flow && rule && (
        <Segmented
          label={t('inputs.taxBasis')}
          options={(['gross', 'net'] as const).map(value => ({
            value,
            label: t(`basis.${rule.kind}.${value}`)
          }))}
          size="small"
          value={basis}
          onChange={value => {
            setBasisTouched(true)
            setBasis(value)
          }}
        />
      )}
      <TextAreaInput
        icon="tabler:notes"
        label="notes"
        placeholder=""
        value={notes}
        onChange={setNotes}
      />
      <Preview
        account={account?.currency ?? currency}
        error={previewError}
        finance={finance}
        kind={kind}
        preview={preview}
        target={target?.currency}
      />
    </EditorShell>
  )
}

function Preview({
  finance,
  preview,
  kind,
  account,
  target,
  error
}: {
  finance: EditorData['finance']
  preview: ReturnType<typeof computeTransaction> | null
  kind: Kind
  account: string
  target?: string
  error: string
}) {
  const { t } = useModuleTranslation()

  if (error)
    return (
      <Text color="dangerous" role="alert" size="sm">
        {error}
      </Text>
    )
  if (!preview) return null

  const rows: [string, string][] = []

  if (kind === 'transfer') {
    rows.push([t('preview.leaves'), finance.native(preview.amount, account)])
    if (target && preview.to_amount)
      rows.push([
        t('preview.arrives'),
        finance.native(preview.to_amount, target)
      ])
  } else {
    if (preview.tax_amount !== '0') {
      rows.push([
        t('preview.gross'),
        finance.native(preview.gross_amount, account)
      ])
      for (const part of preview.parts)
        rows.push([part.label, finance.native(part.tax, account)])
      if (!preview.parts.length)
        rows.push([
          t(kind === 'expense' ? 'preview.vat' : 'preview.tax'),
          finance.native(preview.tax_amount, account)
        ])
      rows.push([t('preview.net'), finance.native(preview.net_amount, account)])
    }
    rows.push([
      t(kind === 'income' ? 'preview.credited' : 'preview.charged'),
      finance.native(preview.amount, account)
    ])
    if (kind === 'income' && !preview.withheld && preview.tax_amount !== '0')
      rows.push([
        t('preview.setAside'),
        finance.native(preview.tax_amount, account)
      ])
  }

  return (
    <Stack aria-live="polite" className="finance-preview" gap="xs">
      {rows.map(([label, value]) => (
        <Flex key={label} gap="md" justify="between">
          <Text color="muted" size="sm">
            {label}
          </Text>
          <Text className="finance-figure" size="sm" weight="medium">
            {value}
          </Text>
        </Flex>
      ))}
      {account !== finance.base && (
        <Text color="muted" size="xs">
          {t('preview.inBase', {
            value: finance.native(preview.base_amount, finance.base),
            rate: formatRate(preview.base_rate, finance.locale),
            from: account,
            to: finance.base
          })}
        </Text>
      )}
    </Stack>
  )
}
