// SPDX-License-Identifier: 0BSD
import { expect, it } from 'vitest'

import { appendTags } from './tags'

it('merges pasted labels without duplicates or mutation', () => {
  const original = ['Research']
  expect(
    appendTags(original, ' Research, Design\nReview\r\nDesign, ', 5)
  ).toEqual(['Research', 'Design', 'Review'])
  expect(original).toEqual(['Research'])
})
it('enforces capacity while preserving existing labels when a limit decreases', () => {
  expect(appendTags(['A', 'B'], 'C,D', 1)).toEqual(['A', 'B'])
  expect(appendTags(['A'], 'B,C', 2.5)).toEqual(['A', 'B'])
  expect(appendTags([], 'A,B', 0)).toEqual([])
})
