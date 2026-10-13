import { Card, Flex } from '@lifeforge/ui'

import type { Achievement } from '../..'
import AchievementMeta from './components/AchievementMeta'
import ActionMenu from './components/ActionMenu'
import AwardIcon from './components/AwardIcon'

function EntryItem({ entry }: { entry: Achievement }) {
  return (
    <Card align="start" as={Flex} gap="lg" justify="between">
      <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
        <AwardIcon difficulty={entry.difficulty} />
        <AchievementMeta
          category={entry.category}
          created={entry.created}
          thoughts={entry.thoughts}
          title={entry.title}
        />
      </Flex>
      <ActionMenu entry={entry} />
    </Card>
  )
}

export default EntryItem
