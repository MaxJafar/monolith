// SPDX-License-Identifier: 0BSD
export type ITempFileManager = {
  write: (data: Buffer | string) => void
  read: <T>() => T
}
export type ITempFileManagerConstructor = new (
  fileName: `${string}.json`,
  jsonType?: 'object' | 'array'
) => ITempFileManager
