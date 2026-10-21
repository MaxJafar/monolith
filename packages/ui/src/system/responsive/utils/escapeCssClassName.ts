// SPDX-License-Identifier: 0BSD
/** Hex escapes also cover punctuation and leading digits without a browser dependency. */
export function escapeCssClassName(identifier: string): string {
  return Array.from(identifier, (character, position) => {
    if (character === '\0') return '\uFFFD'
    const leadingNumber =
      /[0-9]/.test(character) &&
      (position === 0 || (position === 1 && identifier[0] === '-'))
    const loneHyphen = identifier.length === 1 && character === '-'
    return /^[a-z0-9_-]$/i.test(character) && !leadingNumber && !loneHyphen
      ? character
      : '\\' + character.codePointAt(0)!.toString(16) + ' '
  }).join('')
}
