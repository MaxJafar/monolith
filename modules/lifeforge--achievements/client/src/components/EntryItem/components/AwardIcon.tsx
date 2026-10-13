import { Box, Icon } from '@lifeforge/ui'

import type { Achievement } from '../../..'

const DIFFICULTY_COLORS = {
  easy: '#22c55e',
  medium: '#eab308',
  hard: '#ef4444',
  impossible: '#a855f7'
} as const

function AwardIcon({ difficulty }: { difficulty: Achievement['difficulty'] }) {
  return (
    <Box>
      <Box
        p="sm"
        r="md"
        style={{
          borderWidth: '1.5px',
          borderColor: DIFFICULTY_COLORS[difficulty],
          backgroundColor: `${DIFFICULTY_COLORS[difficulty]}20`,
          color: DIFFICULTY_COLORS[difficulty],
          width: 'min-content'
        }}
      >
        <Icon icon="tabler:award" size="1.5em" />
      </Box>
    </Box>
  )
}

export default AwardIcon
