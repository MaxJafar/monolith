// SPDX-License-Identifier: 0BSD
export function toKebabCase(text: string) {
  return text
    .normalize('NFKD')
    .replace(/([\p{Ll}\d])([\p{Lu}])/gu, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
export function isKebabCase(text: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)
}
export function assertKebabRepo(repo: string) {
  const parts = repo.split('/')
  if (parts.length !== 2 || !parts[0] || !isKebabCase(parts[1]!))
    throw Error('Repository must have an owner and a lowercase hyphenated name')
}
