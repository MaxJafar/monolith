import { addCollection } from '@iconify/react'

import collections from '../assets/icons'

/** Register shipped interface icons before rendering, without a runtime CDN request. */
export function registerWorkspaceIcons() {
  for (const collection of collections) addCollection(collection)
}
