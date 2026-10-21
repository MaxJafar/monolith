// SPDX-License-Identifier: 0BSD
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(text)
  const result = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1)
    result[index] = decoded.charCodeAt(index)
  return result
}
export function toBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, value => String.fromCharCode(value)).join(''))
}
