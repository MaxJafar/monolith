// SPDX-License-Identifier: 0BSD
import { useModuleTranslation } from '@monolith/localization'

import { ContextMenuGroup, ContextMenuItem } from '@/components/overlays'

export interface ViewModeContextMenuSelectorProps<
  T extends readonly { value: string; icon?: string; text?: string }[],
  TKey = T[number]['value']
> {
  modes: T
  currentMode: TKey
  onModeChange: (value: TKey) => void
  namespace: string | false | undefined
}
export function ViewModeContextMenuSelector<
  T extends readonly { value: string; icon?: string; text?: string }[],
  TKey = T[number]['value']
>({
  modes,
  currentMode,
  onModeChange,
  namespace
}: ViewModeContextMenuSelectorProps<T, TKey>) {
  const { t } = useModuleTranslation(
    namespace === false ? [] : [namespace || 'common.misc', 'common.misc']
  )
  return (
    <ContextMenuGroup
      icon="tabler:eye"
      label={
        namespace === false ? 'View' : t('viewMode', { defaultValue: 'View' })
      }
    >
      {modes.map(mode => (
        <ContextMenuItem
          key={mode.value}
          icon={mode.icon}
          checked={mode.value === currentMode}
          namespace={false}
          label={
            namespace === false
              ? mode.text || mode.value
              : t(
                  [
                    'viewModes.' + (mode.text || mode.value),
                    'viewModes.' + mode.value
                  ],
                  { defaultValue: mode.text || mode.value }
                )
          }
          onClick={() => onModeChange(mode.value as TKey)}
        />
      ))}
    </ContextMenuGroup>
  )
}
