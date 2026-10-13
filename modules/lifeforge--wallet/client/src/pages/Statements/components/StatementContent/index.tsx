import { Flex, PrintArea, Transition } from '@lifeforge/ui'

import { StatementDataProvider } from '@/pages/Statements/providers/StatementDataProvider'

import StatementEndedText from '../StatementEndedText'
import StatementHeader from './components/StatementHeader'
import Overview from './components/sections/Overview'
import Transactions from './components/sections/Transactions'

function StatementContent({
  contentRef,
  showStatement,
  month,
  year
}: {
  contentRef: React.RefObject<HTMLDivElement | null>
  showStatement: boolean
  month: number
  year: number
}) {
  return (
    <PrintArea contentRef={contentRef}>
      <Transition>
        <Flex
          direction="column"
          display={{ base: showStatement ? 'flex' : 'none', print: 'flex' }}
          height={showStatement ? '100%' : '0'}
          minWidth="0"
          my="lg"
          position="relative"
          style={{
            fontFamily: 'Onest',
            interpolateSize: 'allow-keywords'
          }}
          width="100%"
        >
          <StatementDataProvider month={month} year={year}>
            <StatementHeader month={month} year={year} />
            <Overview month={month} year={year} />
            <Transactions />
            <StatementEndedText />
          </StatementDataProvider>
        </Flex>
      </Transition>
    </PrintArea>
  )
}

export default StatementContent
