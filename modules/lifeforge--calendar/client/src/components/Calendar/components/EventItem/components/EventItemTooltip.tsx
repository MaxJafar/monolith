import { memo } from 'react'

import { Tooltip } from '@lifeforge/ui'

import { type CalendarCategory, type CalendarEvent } from '../../../index.js'
import EventDetails from '../../EventDetails/index.js'

function EventItemTooltip({
  event,
  category
}: {
  event: CalendarEvent
  category: CalendarCategory | undefined
}) {
  return (
    <Tooltip
      clickable
      openOnClick
      id={`calendar-event-${event.id}`}
      place="bottom-end"
    >
      <EventDetails category={category} event={event} />
    </Tooltip>
  )
}

export default memo(EventItemTooltip)
