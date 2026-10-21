// SPDX-License-Identifier: 0BSD
import type {
  AnyRelationsBuilderConfig,
  ExtractTablesFromSchema,
  ExtractTablesWithRelations,
  Schema,
  Table,
  View
} from 'drizzle-orm'

export type ModuleTable = Table | View

export interface ModuleSchema<
  TTables extends Record<string, any> = Record<string, any>
> {
  tables: TTables
  relations: (builder: any) => Record<string, any>
}

export interface ResolvedModuleSchema<
  TTables = Record<string, ModuleTable>,
  TRelations = (builder: any) => Record<string, any>
> {
  tables: TTables
  relations: TRelations
  moduleId?: string
  keyMap?: Record<string, string>
}

export type BuiltModuleSchema<T extends ModuleSchema> =
  ExtractTablesWithRelations<
    ReturnType<T['relations']> & AnyRelationsBuilderConfig,
    ExtractTablesFromSchema<T['tables']> & Schema
  >
