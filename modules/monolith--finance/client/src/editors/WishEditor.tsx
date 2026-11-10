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

import { computeWish } from '../../../core/compute'
import { isPositive } from '../../../core/money'
import type { WishlistItem } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { AmountInput, SelectInput } from '../components/controls'
import {
  accountOptions,
  categoryOptions,
  currencyOptions,
  ruleOptions
} from '../utils/options'
import { type EditorData, EditorShell, Fields, save } from './EditorShell'
import { fromCivil, toCivil } from './TransactionEditor'

export function WishEditor({
  data: { finance, item, preset },
  onClose
}: {
  data: EditorData<WishlistItem, { list_id?: string | null }>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const snapshot = finance.data!
  const [draft, setDraft] = useState({
    list_id: item?.list_id ?? preset?.list_id ?? snapshot.lists[0]?.id ?? null,
    name: item?.name ?? '',
    url: item?.url ?? '',
    price: item?.price ?? (null as string | null),
    currency: item?.currency ?? finance.display,
    quantity: item?.quantity ?? 1,
    shipping: item?.shipping ?? '0',
    tax_rule_id: item?.tax_rule_id ?? null,
    priority: item?.priority ?? 'medium',
    target_on: item?.target_on ?? null,
    category_id: item?.category_id ?? null,
    account_id: item?.account_id ?? null,
    sort: item?.sort ?? 0,
    notes: item?.notes ?? ''
  })
  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const totals =
    draft.price && finance.book
      ? computeWish(
          {
            price: draft.price,
            quantity: draft.quantity,
            shipping: draft.shipping || '0',
            currency: draft.currency,
            rule: finance.ruleCore(draft.tax_rule_id)
          },
          finance.book
        )
      : null

  return (
    <EditorShell
      wide
      canSave={
        !!draft.name.trim() &&
        !!draft.price &&
        (isPositive(draft.price) || draft.price === '0')
      }
      icon="tabler:gift"
      title={t(item ? 'editor.editWish' : 'editor.newWish')}
      onClose={onClose}
      onDelete={
        item
          ? () =>
              save(finance, () =>
                workspaceAPI.wishlist.delete.mutate({
                  id: item.id,
                  expected_updated: item.updated
                })
              )
          : undefined
      }
      onSave={() =>
        save(finance, () =>
          workspaceAPI.wishlist.save.mutate({
            ...draft,
            name: draft.name.trim(),
            price: draft.price ?? '0',
            shipping: draft.shipping || '0',
            ...(item ? { id: item.id, expected_updated: item.updated } : {})
          })
        )
      }
    >
      <Fields>
        <TextInput
          autoFocus
          required
          icon="tabler:gift"
          label="itemName"
          placeholder={t('placeholders.wish')}
          value={draft.name}
          onChange={name => set({ name })}
        />
        <SelectInput
          icon="tabler:list"
          label="list"
          options={[
            { value: '', label: t('labels.unsorted'), icon: 'tabler:inbox' },
            ...snapshot.lists.map(list => ({
              value: list.id,
              label: list.name,
              icon: list.icon || 'tabler:list'
            }))
          ]}
          value={draft.list_id ?? ''}
          onChange={list_id => set({ list_id: list_id || null })}
        />
        <AmountInput
          required
          label="price"
          suffix={draft.currency}
          value={draft.price}
          onChange={price => set({ price })}
        />
        <SelectInput
          icon="tabler:currency"
          label="currency"
          options={currencyOptions(finance, [draft.currency])}
          value={draft.currency}
          onChange={currency => set({ currency })}
        />
        <NumberInput
          icon="tabler:stack-2"
          label="quantity"
          max={1000}
          min={1}
          value={draft.quantity}
          onChange={quantity =>
            set({ quantity: Math.max(1, Math.round(quantity || 1)) })
          }
        />
        <AmountInput
          icon="tabler:truck-delivery"
          label="shipping"
          suffix={draft.currency}
          value={draft.shipping}
          onChange={shipping => set({ shipping: shipping ?? '0' })}
        />
        <SelectInput
          icon="tabler:receipt-tax"
          label="taxRule"
          options={ruleOptions(finance, 'expense', t('labels.noTax'))}
          value={draft.tax_rule_id ?? ''}
          onChange={id => set({ tax_rule_id: id || null })}
        />
        <SelectInput
          icon="tabler:flag"
          label="priority"
          options={(['high', 'medium', 'low'] as const).map(value => ({
            value,
            label: t(`priority.${value}`),
            icon:
              value === 'high'
                ? 'tabler:flame'
                : value === 'medium'
                  ? 'tabler:flag'
                  : 'tabler:feather'
          }))}
          value={draft.priority}
          onChange={priority => set({ priority })}
        />
        <TextInput
          icon="tabler:link"
          label="link"
          placeholder="https://"
          value={draft.url}
          onChange={url => set({ url })}
        />
        <DateInput
          icon="tabler:calendar-event"
          label="targetDate"
          value={fromCivil(draft.target_on)}
          onChange={value => set({ target_on: value ? toCivil(value) : null })}
        />
        <SelectInput
          label="expenseCategory"
          options={categoryOptions(
            finance,
            'expense',
            t('labels.defaultCategory')
          )}
          value={draft.category_id ?? ''}
          onChange={category_id => set({ category_id: category_id || null })}
        />
        <SelectInput
          label="payFrom"
          options={[
            {
              value: '',
              label: t('labels.defaultAccount'),
              icon: 'tabler:wallet'
            },
            ...accountOptions(finance)
          ]}
          value={draft.account_id ?? ''}
          onChange={account_id => set({ account_id: account_id || null })}
        />
      </Fields>
      {totals && (
        <Stack aria-live="polite" className="finance-preview" gap="xs">
          {[
            ['preview.subtotal', totals.subtotal],
            ['preview.vat', totals.tax],
            ['preview.total', totals.total]
          ].map(([label, value]) => (
            <Flex key={label} justify="between">
              <Text color="muted" size="sm">
                {t(label!)}
              </Text>
              <Text
                className="finance-figure"
                size="sm"
                weight={label === 'preview.total' ? 'semibold' : 'medium'}
              >
                {finance.native(value, draft.currency)}
              </Text>
            </Flex>
          ))}
          {draft.currency !== finance.display && (
            <Text color="muted" size="xs">
              {t('preview.converted', {
                value: finance.money(totals.base_total)
              })}
            </Text>
          )}
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

/** Asked only when an item has no account to pay from yet. */
export function PurchaseDialog({
  data: { finance, item },
  onClose
}: {
  data: EditorData<WishlistItem>
  onClose: () => void
}) {
  const { t } = useModuleTranslation()

  const [accountId, setAccountId] = useState(
    item!.account_id ??
      finance.data!.settings.default_account_id ??
      finance.data!.accounts[0]?.id ??
      ''
  )
  const [categoryId, setCategoryId] = useState(
    item!.category_id ?? finance.data!.settings.wish_category_id ?? ''
  )

  const [date, setDate] = useState(finance.today)

  return (
    <EditorShell
      canSave={!!accountId}
      icon="tabler:shopping-cart-check"
      saveLabel="markBought"
      title={t('editor.buy', { name: item!.name })}
      onClose={onClose}
      onSave={() =>
        save(finance, () =>
          workspaceAPI.wishlist.purchase.mutate({
            id: item!.id,
            expected_updated: item!.updated,
            purchased: true,
            account_id: accountId,
            category_id: categoryId || null,
            occurred_on: date
          })
        )
      }
    >
      <Text color="muted">
        {t('wishlist.buyHelp', {
          total: finance.native(item!.total, item!.currency)
        })}
      </Text>
      <Fields>
        <SelectInput
          label="payFrom"
          options={accountOptions(finance)}
          value={accountId}
          onChange={setAccountId}
        />
        <SelectInput
          label="expenseCategory"
          options={categoryOptions(
            finance,
            'expense',
            t('labels.uncategorized')
          )}
          value={categoryId}
          onChange={setCategoryId}
        />
        <DateInput
          icon="tabler:calendar"
          label="date"
          value={fromCivil(date)}
          onChange={value => value && setDate(toCivil(value))}
        />
      </Fields>
    </EditorShell>
  )
}
