import { SidebarDivider, SidebarWrapper } from '@lifeforge/ui'

import type { CalendarEvent } from '@/components/Calendar'
import type { DatabaseFeed } from '@/utils/calendarModel'

import CalendarList from './components/CalendarList'
import CategoryList from './components/CategoryList'
import MiniCalendar from './components/MiniCalendar'

export default function Sidebar({
  databaseSources,
  databaseEvents
}: {
  databaseSources: DatabaseFeed['sources']
  databaseEvents: CalendarEvent[]
}) {
  return (
    <SidebarWrapper>
      <MiniCalendar databaseEvents={databaseEvents} />
      <SidebarDivider />
      <CalendarList databaseSources={databaseSources} />
      <SidebarDivider />
      <CategoryList />
    </SidebarWrapper>
  )
}
