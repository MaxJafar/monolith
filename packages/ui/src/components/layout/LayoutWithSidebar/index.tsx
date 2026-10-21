// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'

import '../sidebar-layout.css'

export function LayoutWithSidebar({ children }: { children: ReactNode }) {
  return <div className="monolith-sidebar-layout">{children}</div>
}
