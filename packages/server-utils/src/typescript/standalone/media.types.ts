// SPDX-License-Identifier: 0BSD
import type { StagedFile } from '@monolith/file-storage'

export type MediaConfig = Record<
  string,
  { optional: boolean; multiple?: boolean }
>
type Uploaded<C> = C extends { multiple: true }
  ? StagedFile[]
  : C extends { optional: true }
    ? StagedFile | string | undefined
    : StagedFile | string
export type ConvertMedia<C extends MediaConfig | null> = C extends null
  ? Record<string, never>
  : { [Key in keyof C]: Uploaded<C[Key]> }
export type ReplaceFileWithMulter<T> = T extends File
  ? StagedFile
  : T extends Array<infer Item>
    ? Array<ReplaceFileWithMulter<Item>>
    : T extends ReadonlyArray<infer Item>
      ? ReadonlyArray<ReplaceFileWithMulter<Item>>
      : T extends (...args: unknown[]) => unknown
        ? T
        : T extends object
          ? { [Key in keyof T]: ReplaceFileWithMulter<T[Key]> }
          : T
