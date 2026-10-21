// SPDX-License-Identifier: 0BSD
import type { Router } from 'express'

type ContractMarker = { readonly __isEndpointContract: true }
export type RouterInput = {
  [segment: string]: RouterInput | Router | ContractMarker
}
export type EndpointTree<T extends RouterInput> = T
/** Preserve the exact route keys for contract inference. */
export default function defineRoutes<T extends RouterInput>(
  tree: T
): EndpointTree<T> {
  return tree
}
