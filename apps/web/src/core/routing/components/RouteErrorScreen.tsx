// SPDX-License-Identifier: 0BSD
import { isRouteErrorResponse, useRouteError } from 'react-router'

import { ErrorScreen } from '@monolith/ui'

export default function RouteErrorScreen() {
  const failure = useRouteError()
  const message =
    failure instanceof Error
      ? failure.message
      : isRouteErrorResponse(failure)
        ? failure.status + ' ' + failure.statusText
        : 'This page could not be loaded.'
  return <ErrorScreen message={message} />
}
