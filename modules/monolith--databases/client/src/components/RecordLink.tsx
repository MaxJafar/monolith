import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useDatabases } from '@/DatabaseProvider'

import type { RecordPage } from '../../../shared'

/** Ordinary links retain open-in-new-tab; inline databases can open in place. */
export function RecordLink({
  record,
  children,
  className
}: {
  record: RecordPage
  children: ReactNode
  className?: string
}) {
  const { embedded, openRecord, recordHref } = useDatabases()
  return (
    <Link
      className={className}
      to={recordHref(record)}
      onClick={event => {
        if (
          !embedded ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        openRecord(record)
      }}
    >
      {children}
    </Link>
  )
}
