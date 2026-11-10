import { useModalStore } from '@monolith/ui'

import type {
  Account,
  Category,
  Recurring,
  TaxRule,
  Transaction,
  WishlistItem,
  WishlistList
} from '../../../core/schemas'
import { useFinance } from '../FinanceContext'
import { AccountEditor } from './AccountEditor'
import {
  CategoryEditor,
  type CategoryPreset,
  ListEditor
} from './CategoryEditor'
import { RecurringEditor } from './RecurringEditor'
import { TaxRuleEditor } from './TaxRuleEditor'
import { TransactionEditor, type TransactionPreset } from './TransactionEditor'
import { PurchaseDialog, WishEditor } from './WishEditor'

/** Open editors with the provider's current state and write path. */
export function useEditors() {
  const finance = useFinance()
  const { open } = useModalStore()

  return {
    transaction: (item?: Transaction, preset?: TransactionPreset) =>
      open(TransactionEditor, { finance, item, preset }),
    account: (item?: Account) => open(AccountEditor, { finance, item }),
    category: (item?: Category, preset?: CategoryPreset) =>
      open(CategoryEditor, { finance, item, preset }),
    rule: (item?: TaxRule) => open(TaxRuleEditor, { finance, item }),
    list: (item?: WishlistList) => open(ListEditor, { finance, item }),
    wish: (item?: WishlistItem, preset?: { list_id?: string | null }) =>
      open(WishEditor, { finance, item, preset }),
    purchase: (item: WishlistItem) => open(PurchaseDialog, { finance, item }),
    plan: (item?: Recurring, preset?: { kind?: 'income' | 'expense' }) =>
      open(RecurringEditor, { finance, item, preset })
  }
}
