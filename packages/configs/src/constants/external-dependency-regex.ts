// SPDX-License-Identifier: 0BSD
// Package names and Node subpaths can remain external. Source entries and path
// navigation must be bundled, including bare-looking "src/index.ts" entries.
const segment = '[A-Za-z0-9_.-]+'
const noTraversal = '(?!\\.{1,2}(?:/|$))'
const noSourceFile = '(?!.*[/][^/]+[.](?:c|m)?(?:j|t)sx?$)'
export const externalDependencyRegex = new RegExp(
  '^' +
    noSourceFile +
    '(?![./])(?:node:)?(?:@' +
    segment +
    '/)?' +
    segment +
    '(?:/' +
    noTraversal +
    segment +
    ')*$'
)
