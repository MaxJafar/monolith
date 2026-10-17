import { useModuleTranslation } from '@monolith/localization'
import {
  Flex,
  Icon,
  Text,
  WithQuery,
  colorWithOpacity,
  usePersonalization
} from '@monolith/ui'

import { useWalletData } from '@/hooks/useWalletData'
import { useStatementData } from '@/pages/Statements/providers/StatementDataProvider'
import numberToCurrency from '@/utils/numberToCurrency'

function PlatformsTable() {
  const { platformsQuery } = useWalletData()
  const { statementQuery } = useStatementData()
  const { t } = useModuleTranslation()
  const { getMostReadableColor } = usePersonalization()

  const headerTextColor = getMostReadableColor()

  return (
    <WithQuery query={platformsQuery}>
      {platforms => (
        <WithQuery query={statementQuery}>
          {({ platformBreakdown }) =>
            platformBreakdown.length === 0 ? null : (
              <>
                <Text
                  as="h2"
                  mt="3xl"
                  size={{ base: '2xl', print: 'lg' }}
                  tracking="widest"
                  transform="uppercase"
                  weight="semibold"
                >
                  <Text>1.4 </Text>
                  {t('widgets.platformsBreakdown')}
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
                        {t('statement.platform')}
                      </th>
                      <th
                        style={{
                          padding: '0.75rem',
                          fontSize: '1.125rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        RM
                      </th>
                      <th
                        style={{
                          padding: '0.75rem',
                          fontSize: '1.125rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformBreakdown.map((item, index) => {
                      const platform = platforms.find(
                        p => p.id === item.platform
                      )

                      return (
                        <tr
                          key={item.platform ?? 'unassigned'}
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
                            <Flex align="center" gap="sm">
                              <Icon
                                icon={platform?.icon ?? 'tabler:building-store'}
                                size="1.5rem"
                                style={{ color: platform?.color }}
                              />
                              <Text whiteSpace="nowrap">
                                {platform?.name ?? t('statement.unassigned')}
                              </Text>
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
                            {numberToCurrency(item.amount)}
                          </td>
                          <td
                            style={{
                              padding: '0.75rem',
                              textAlign: 'right',
                              fontSize: '1.125rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.percentage.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )
          }
        </WithQuery>
      )}
    </WithQuery>
  )
}

export default PlatformsTable
