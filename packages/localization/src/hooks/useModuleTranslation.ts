import { addonPackageName } from '@monolith/configs'
import { useModuleMetadata } from '@monolith/federation'
import { useTranslation } from 'react-i18next'

export function useModuleTranslation(extraKeys: string[] = []) {
  const { name } = useModuleMetadata()

  const ns = name ? `apps.${addonPackageName(name)}` : undefined

  const { t, i18n, ready } = useTranslation(ns ? [ns, ...extraKeys] : extraKeys)

  return { t, i18n, ready, ns }
}
