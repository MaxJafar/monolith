import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useEffect } from 'react'
import { useLocation } from 'react-router'

import type { InferOutput } from '@lifeforge/api'
import { useModuleTranslation } from '@lifeforge/localization'
import {
  Box,
  ContentWrapperWithSidebar,
  ContextMenu,
  ContextMenuItem,
  EmptyStateScreen,
  Flex,
  LayoutWithSidebar,
  ModuleHeader,
  Pagination,
  Scrollbar,
  SearchInput,
  Stack,
  Text,
  WithQuery,
  useModalStore
} from '@lifeforge/ui'

import useFilter from '@/hooks/useFilter'
import useTransactionsQuery from '@/hooks/useTransactionsQuery'
import { forgeAPI } from '@/manifest'

import InnerHeader from './components/InnerHeader'
import Sidebar from './components/Sidebar'
import TransactionCreationMenu from './components/TransactionCreationMenu'
import TransactionItem from './components/TransactionItem'
import ChooseTemplateModal from './modals/ChooseTemplateModal'
import ModifyTransactionsModal from './modals/ModifyTransactionsModal'
import NaturalLanguageModal from './modals/NaturalLanguageModal'
import ScanReceiptModal from './modals/ScanReceiptModal'

export type WalletTransaction = InferOutput<
  typeof forgeAPI.transactions.list
>['groups'][number]['items'][number]

export type WalletCategory = InferOutput<
  typeof forgeAPI.categories.list
>[number]

function Transactions() {
  const { hash } = useLocation()
  const { open } = useModalStore()
  const { t } = useModuleTranslation()
  const transactionsQuery = useTransactionsQuery()
  const { page, setPage, asset, searchQuery, setSearchQuery } = useFilter()
  const queryClient = useQueryClient()

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: forgeAPI.transactions.key
    })
  }, [queryClient])

  useEffect(() => {
    const modals = {
      '#new': () => open(ModifyTransactionsModal, { type: 'create' }),
      '#template': () => open(ChooseTemplateModal, {}),
      '#scan': () => open(ScanReceiptModal, {}),
      '#ai': () => open(NaturalLanguageModal, {})
    } as const

    if (!Object.keys(modals).includes(hash)) return

    modals[hash as keyof typeof modals]()
  }, [hash])

  const today = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')

  const getGroupLabel = (date: string) => {
    const groupDate = dayjs(date)

    if (groupDate.isSame(today, 'day')) {
      return t('transactionGroups.today')
    }

    if (groupDate.isSame(yesterday, 'day')) {
      return t('transactionGroups.yesterday')
    }

    return groupDate.format('MMM DD, YYYY')
  }

  return (
    <>
      <ModuleHeader
        icon="tabler:arrows-exchange"
        title="Transactions"
        trailing={
          <>
            <TransactionCreationMenu variant="desktop" />
            <ContextMenu
              componentProps={{
                menu: { minWidth: '16rem' }
              }}
            >
              <ContextMenuItem
                icon="tabler:refresh"
                label="Refresh"
                onClick={handleRefresh}
              />
            </ContextMenu>
          </>
        }
      />
      <LayoutWithSidebar>
        <Sidebar />
        <ContentWrapperWithSidebar>
          <InnerHeader />
          <SearchInput
            debounceMs={300}
            mt="md"
            searchTarget="transaction"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Stack gap="md" height="100%" my="lg" width="100%">
            <WithQuery query={transactionsQuery}>
              {transactions =>
                transactions.groups.length > 0 ? (
                  <>
                    <Pagination
                      page={page}
                      totalPages={transactions.totalPages}
                      onPageChange={setPage}
                    />
                    <Scrollbar>
                      <Stack gap="xl">
                        {transactions.groups.map(group => (
                          <Stack key={group.date} gap="sm">
                            <Flex align="center" gap="sm">
                              <Box
                                bg="primary"
                                height="1.25rem"
                                r="full"
                                width="0.25rem"
                              />
                              <Text
                                color="muted"
                                size="sm"
                                tracking="wide"
                                weight="semibold"
                              >
                                {getGroupLabel(group.date)}
                              </Text>
                            </Flex>
                            <Stack gap="sm">
                              {group.items.map(transaction => (
                                <TransactionItem
                                  key={transaction.id}
                                  highlightAsset={asset}
                                  transaction={transaction}
                                />
                              ))}
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </Scrollbar>
                  </>
                ) : (
                  <EmptyStateScreen
                    icon="tabler:wallet-off"
                    message={{
                      id: 'transactions'
                    }}
                  />
                )
              }
            </WithQuery>
            <TransactionCreationMenu variant="mobile" />
          </Stack>
        </ContentWrapperWithSidebar>
      </LayoutWithSidebar>
    </>
  )
}

export default Transactions
