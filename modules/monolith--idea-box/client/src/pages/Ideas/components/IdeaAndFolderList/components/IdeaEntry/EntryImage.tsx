import Zoom from 'react-medium-image-zoom'

import { Box } from '@monolith/ui'

import { workspaceAPI } from '@/manifest'
import type { IdeaBoxIdea } from '@/providers/IdeaBoxProvider'

import CustomZoomContent from './components/CustomZoomContent'
import IdeaWrapper from './components/IdeaWrapper'

function EntryImage({ entry }: { entry: IdeaBoxIdea }) {
  if (entry.type !== 'image') {
    return null
  }

  return (
    <IdeaWrapper entry={entry}>
      <Zoom
        ZoomContent={CustomZoomContent}
        zoomImg={{
          src: workspaceAPI.getMedia({
            key: entry.image
          })
        }}
        zoomMargin={40}
      >
        <Box asChild shadow r="lg">
          <img
            alt={''}
            src={workspaceAPI.getMedia({
              key: entry.image
            })}
          />
        </Box>
      </Zoom>
    </IdeaWrapper>
  )
}

export default EntryImage
