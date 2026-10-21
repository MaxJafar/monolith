// SPDX-License-Identifier: 0BSD
import { useEffect, useState } from 'react'

import { useAuth } from '@monolith/api'
import { Flex, Icon, Text, useMainSidebarState } from '@monolith/ui'

export function sidebarOccasion(today: Date, birthDate?: string | null) {
  const month = today.getMonth() + 1,
    day = today.getDate()
  if (month === 8 && day === 31)
    return { icon: 'tabler:flag', text: 'Celebrating Malaysia’s independence' }
  if (month === 12 && day === 25)
    return { icon: 'tabler:gift', text: 'Wishing you a joyful Christmas' }
  const birth = birthDate?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (birth && Number(birth[2]) === month && Number(birth[3]) === day)
    return { icon: 'tabler:cake', text: 'A new year for you. Happy birthday!' }
  return null
}
export default function SidebarEventBanner() {
  const { userData } = useAuth()
  const { sidebarExpanded } = useMainSidebarState()
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setToday(new Date())
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const occasion = sidebarOccasion(today, userData?.dateOfBirth)
  if (!sidebarExpanded || !userData || !occasion) return null
  return (
    <Flex
      gap="sm"
      align="center"
      p="md"
      bg={{ base: 'bg-100', dark: 'bg-800' }}
    >
      <Icon icon={occasion.icon} />
      <Text as="p" size="sm">
        {occasion.text}
      </Text>
    </Flex>
  )
}
