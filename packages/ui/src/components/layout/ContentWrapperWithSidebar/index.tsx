// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import '../sidebar-layout.css'

export function ContentWrapperWithSidebar({
  children
}: {
  children: ReactNode
}) {
  return <div className="monolith-sidebar-content">{children}</div>
}
