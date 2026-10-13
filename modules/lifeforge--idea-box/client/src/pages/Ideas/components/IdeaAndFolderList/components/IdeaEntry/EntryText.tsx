import { useState } from 'react'
import Markdown from 'react-markdown'

import { Box, Prose, Text } from '@lifeforge/ui'

import type { IdeaBoxIdea } from '@/providers/IdeaBoxProvider'

import IdeaWrapper from './components/IdeaWrapper'

function EntryText({ entry }: { entry: IdeaBoxIdea }) {
  const [expanded, setExpanded] = useState(false)

  if (entry.type !== 'text') {
    return null
  }

  return (
    <IdeaWrapper
      entry={entry}
      onClick={() => {
        setExpanded(prev => !prev)
      }}
    >
      {!expanded ? (
        <Box asChild minWidth="0" width="100%">
          <Text
            as="p"
            lineClamp={6}
            overflow="hidden"
            style={{ userSelect: 'text' }}
            whiteSpace="pre-wrap"
            wordBreak="break-all"
          >
            {entry.content}
          </Text>
        </Box>
      ) : (
        <Prose style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <Markdown>{entry.content}</Markdown>
        </Prose>
      )}
    </IdeaWrapper>
  )
}

export default EntryText
