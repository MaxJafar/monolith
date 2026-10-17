import dayjs from 'dayjs'

import { useModuleTranslation } from '@monolith/localization'
import {
  Flex,
  Icon,
  Stack,
  Text,
  WithQuery,
  colorWithOpacity,
  usePersonalization
} from '@monolith/ui'

import LiabilityUtilisation from '@/components/LiabilityUtilisation'
import { useWalletData } from '@/hooks/useWalletData'
import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'
import numberToCurrency from '@/utils/numberToCurrency'

function AssetsTable({ month }: { month: number }) {
  const { assetsQuery } = useWalletData()
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()
  const { getMostReadableColor } = usePersonalization()

  const headerTextColor = getMostReadableColor()

  return (
    <WithQuery query={assetsQuery}>
      {assets => (
        <WithQuery query={statementQuery}>
          {({ assets: assetData }) => (
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
                    {t('statement.assets')}
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
                      .month(month - 1)
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
                    {dayjs().month(month).format('MMM YYYY')}
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
                {[...assets]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((asset, index) => {
                    const balance = assetData.balances[asset.id]

                    if (!balance) return null

                    const { last, current, change, percentage } = balance

                    return (
                      <tr
                        key={asset.id}
                        style={{
                          backgroundColor:
                            index % 2 === 0
                              ? colorWithOpacity('bg-500', '5%').toString()
                              : undefined
                        }}
                      >
                        <td
                          style={{
                            padding: '0.75rem',
                            fontSize: '1.125rem'
                          }}
                        >
                          <Stack gap="xs">
                            <Flex align="center" gap="sm">
                              <Icon icon={asset.icon} size="1.5rem" />
                              <Text whiteSpace="nowrap">{asset.name}</Text>
                              {asset.is_liability && (
                                <Text
                                  size="sm"
                                  style={{
                                    color: '#e11d48',
                                    border: '1px solid #e11d48',
                                    borderRadius: '999px',
                                    padding: '0 0.5rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {t('tags.liability')}
                                </Text>
                              )}
                            </Flex>
                            <LiabilityUtilisation asset={asset} />
                          </Stack>
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            fontSize: '1.125rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {numberToCurrency(last)}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            fontSize: '1.125rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {numberToCurrency(current)}
                        </td>
                        <td
                          style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            fontSize: '1.125rem',
                            whiteSpace: 'nowrap',
                            color: change < 0 ? '#e11d48' : undefined
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
                            whiteSpace: 'nowrap',
                            color: percentage < 0 ? '#e11d48' : undefined
                          }}
                        >
                          {percentage < 0
                            ? `(${Math.abs(percentage).toFixed(2)}%)`
                            : `${percentage.toFixed(2)}%`}
                        </td>
                      </tr>
                    )
                  })}
                {[
                  { label: t('widgets.totalAssets'), data: assetData.total },
                  {
                    label: t('widgets.totalLiabilities'),
                    data: assetData.liabilitiesTotal
                  },
                  { label: t('widgets.netWorth'), data: assetData.netWorth }
                ].map(row => (
                  <tr key={row.label}>
                    <td
                      style={{
                        padding: '0.75rem',
                        fontSize: '1.125rem'
                      }}
                    >
                      <Text size="xl" weight="semibold">
                        {row.label}
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
                      {numberToCurrency(row.data.last)}
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
                      {numberToCurrency(row.data.current)}
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
                        color: row.data.change < 0 ? '#e11d48' : undefined
                      }}
                    >
                      {row.data.change < 0
                        ? `(${numberToCurrency(Math.abs(row.data.change))})`
                        : numberToCurrency(row.data.change)}
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
                        color: row.data.percentage < 0 ? '#e11d48' : undefined
                      }}
                    >
                      {row.data.percentage < 0
                        ? `(${Math.abs(row.data.percentage).toFixed(2)}%)`
                        : `${row.data.percentage.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </WithQuery>
      )}
    </WithQuery>
  )
}

export default AssetsTable
