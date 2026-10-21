// SPDX-License-Identifier: 0BSD
import { useTranslation } from 'react-i18next'

import { addonPackageName } from '@monolith/configs'
import { useModuleMetadata } from '@monolith/federation'

export function useModuleTranslation(extraKeys: string[] = []) {
  const module = useModuleMetadata()
  const ns = module.name ? 'apps.' + addonPackageName(module.name) : undefined
  const namespaces = ns ? [ns, ...extraKeys] : extraKeys
  const { t, i18n, ready } = useTranslation([...new Set(namespaces)])
  return { t, i18n, ready, ns }
}
