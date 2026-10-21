// SPDX-License-Identifier: 0BSD
import { StateMessage } from '../StateMessage'

export function LoadingScreen({
  message,
  loaderSize
}: {
  message?: string
  loaderSize?: string
}) {
  return (
    <StateMessage
      icon="svg-spinners:ring-resize"
      title={message}
      size={loaderSize}
    />
  )
}
