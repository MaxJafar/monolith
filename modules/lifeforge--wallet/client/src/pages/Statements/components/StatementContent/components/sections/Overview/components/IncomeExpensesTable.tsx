import dayjs from 'dayjs'
import { useMemo } from 'react'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Flex,
  Icon,
  Text,
  WithQuery,
  colorWithOpacity,
  usePersonalization
} from '@lifeforge/ui'

import { useWalletData } from '@/hooks/useWalletData'
import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'
import numberToCurrency from '@/utils/numberToCurrency'

const EMPTY_ITEM = {
  currentAmount: 0,
  previousAmount: 0,
  change: 0,
  percentageChange: 0
}

function IncomeExpensesTable({
  month,
  year,
  type
}: {
  month: number
  year: number
  type: 'income' | 'expenses'
}) {
  const { categoriesQuery } = useWalletData()
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()
  const { getMostReadableColor } = usePersonalization()

  const headerTextColor = getMostReadableColor()

  const categories = categoriesQuery.data ?? []

  const prevMonth = useMemo(() => {
    const date = dayjs().year(year).month(month).subtract(1, 'month')

    return { month: date.month() + 1, year: date.year() }
  }, [month, year])

  const filteredCategories = useMemo(
    () =>
      categories
        .filter(category => category.type === type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, type]
  )

  return (
    <WithQuery query={statementQuery}>
      {({ categoryComparison }) => {
        const comparison = categoryComparison[type]

        const change = comparison.totalChange

        const isNegativeChange = type === 'income' ? change < 0 : change > 0

        return (
          <>
            <Text
              as="h2"
              mt="3xl"
              size={{ base: '2xl', print: 'lg' }}
              tracking="widest"
              transform="uppercase"
              weight="semibold"
            >
              <Text>1.{type === 'income' ? '2' : '3'} </Text>
              {t(`transactionTypes.${type}`)}
            </Text>
            <table
              style={{ width: '100%', marginTop: '1.5rem', minWidth: '0' }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-custom-500)',
                    color: headerTextColor
                  }}
                >
                  <th
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  >
                    {t('statement.category')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {dayjs()
                      .year(prevMonth.year)
                      .month(prevMonth.month - 1)
                      .format('MMM YYYY')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {dayjs().year(year).month(month).format('MMM YYYY')}
                  </th>
                  <th
                    colSpan={2}
                    style={{
                      padding: '0.75rem',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t('statement.change')}
                  </th>
                </tr>
                <tr
                  style={{
                    backgroundColor: 'var(--color-bg-800)',
                    color: 'white'
                  }}
                >
                  <th
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      textAlign: 'left',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  ></th>
                  <th
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  >
                    RM
                  </th>
                  <th
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  >
                    RM
                  </th>
                  <th
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  >
                    RM
                  </th>
                  <th
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1.125rem',
                      fontWeight: '500'
                    }}
                  >
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category, index) => {
                  const item = comparison.items[category.id] ?? EMPTY_ITEM

                  const isNegativeChange =
                    type === 'income' ? item.change < 0 : item.change > 0

                  return (
                    <tr
                      key={category.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? colorWithOpacity('bg-500', '5%').toString()
                            : undefined
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '1.125rem' }}>
                        <Flex align="center" gap="sm">
                          <Icon
                            icon={category.icon}
                            size="1.5rem"
                            style={{ color: category.color }}
                          />
                          <Text whiteSpace="nowrap">{category.name}</Text>
                        </Flex>
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontSize: '1.125rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {numberToCurrency(item.previousAmount)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontSize: '1.125rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {numberToCurrency(item.currentAmount)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontSize: '1.125rem',
                          whiteSpace: 'nowrap',
                          color: isNegativeChange ? '#e11d48' : undefined
                        }}
                      >
                        {item.change < 0
                          ? `(${numberToCurrency(Math.abs(item.change))})`
                          : numberToCurrency(item.change)}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontSize: '1.125rem',
                          whiteSpace: 'nowrap',
                          color: isNegativeChange ? '#e11d48' : undefined
                        }}
                      >
                        {Math.abs(item.previousAmount) < 0.001
                          ? '-'
                          : `${item.percentageChange.toFixed(2)}%`}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ padding: '0.75rem', fontSize: '1.125rem' }}>
                    <Text size="xl" weight="semibold">
                      {t('statement.totalType', {
                        type: t(`transactionTypes.${type}`)
                      })}
                    </Text>
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      borderTop: '2px solid',
                      borderBottom: '6px double'
                    }}
                  >
                    {numberToCurrency(comparison.previousTotal)}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      borderTop: '2px solid',
                      borderBottom: '6px double'
                    }}
                  >
                    {numberToCurrency(comparison.currentTotal)}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      borderTop: '2px solid',
                      borderBottom: '6px double',
                      color: isNegativeChange ? '#e11d48' : undefined
                    }}
                  >
                    {change < 0
                      ? `(${numberToCurrency(Math.abs(change))})`
                      : numberToCurrency(change)}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontSize: '1.125rem',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      borderTop: '2px solid',
                      borderBottom: '6px double',
                      color: isNegativeChange ? '#e11d48' : undefined
                    }}
                  >
                    {Math.abs(comparison.previousTotal) < 0.001
                      ? '-'
                      : `${comparison.totalPercentageChange.toFixed(2)}%`}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )
      }}
    </WithQuery>
  )
}

export default IncomeExpensesTable
