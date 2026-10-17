import { type ReactNode, createContext, useContext } from 'react'

import type { WalletTransaction } from '@/hooks/useWalletData'

type TransactionItemContextValue = {
  transaction: WalletTransaction
  highlightAsset?: string
}

const TransactionItemContext =
  createContext<TransactionItemContextValue | null>(null)

export function TransactionItemProvider({
  transaction,
  highlightAsset,
  children
}: TransactionItemContextValue & { children: ReactNode }) {
  return (
    <TransactionItemContext value={{ transaction, highlightAsset }}>
      {children}
    </TransactionItemContext>
  )
}

export function useTransactionItemContext() {
  const context = useContext(TransactionItemContext)

  if (!context) {
    throw new Error(
      'useTransactionItemContext must be used within a TransactionItemProvider'
    )
  }

  return context
}
