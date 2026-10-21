// SPDX-License-Identifier: 0BSD
import { ListboxOption } from './ListboxOption'

export function ListboxNullOption({
  icon,
  value = '',
  text = 'None'
}: {
  icon: string
  value?: unknown
  hasBgColor?: boolean
  text?: string
}) {
  return <ListboxOption value={value} label={text} icon={icon} />
}
