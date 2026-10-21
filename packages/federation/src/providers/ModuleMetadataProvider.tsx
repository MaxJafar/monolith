// SPDX-License-Identifier: 0BSD
import { createContext, useContext } from 'react'

interface Metadata {
  name?: string
  icon: string
  title: string
}
const empty: Metadata = {
  name: '',
  icon: 'tabler:cube',
  title: 'Untitled Module'
}
export const ModuleMetadataProvider = createContext<Metadata | undefined>(
  undefined
)
export function useModuleMetadata(): Metadata {
  return useContext(ModuleMetadataProvider) ?? empty
}
