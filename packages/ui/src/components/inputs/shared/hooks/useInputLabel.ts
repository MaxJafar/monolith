// SPDX-License-Identifier: 0BSD
import { camelCase } from 'lodash'

import { useModuleTranslation } from '@monolith/localization'

export function useInputLabel({
  label,
  namespace
}: {
  label: string
  namespace?: string | false
}) {
  const { t } = useModuleTranslation(namespace ? [namespace] : undefined)
  if (namespace === false) return label
  const forms = [...new Set([camelCase(label), label])]
  const local = ['inputs.', ''].flatMap(prefix =>
    forms.flatMap(name => [prefix + name + '.label', prefix + name])
  )
  const keys = namespace
    ? [...local, ...local.map(key => namespace + ':' + key)]
    : local
  return t(keys, { defaultValue: label })
}
