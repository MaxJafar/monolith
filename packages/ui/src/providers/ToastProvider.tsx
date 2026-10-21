// SPDX-License-Identifier: 0BSD
import type { ReactNode } from 'react'
import { ToastContainer } from 'react-toastify'

import { usePersonalization } from './PersonalizationProvider'

export { toast } from 'react-toastify'
export function ToastProvider({ children }: { children: ReactNode }) {
  const { derivedTheme } = usePersonalization()
  return (
    <>
      {children}
      <ToastContainer
        theme={derivedTheme}
        position="bottom-center"
        autoClose={3000}
        closeOnClick
        pauseOnFocusLoss
        pauseOnHover
        draggable
        limit={4}
      />
    </>
  )
}
