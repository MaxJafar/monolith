// SPDX-License-Identifier: 0BSD
import { getTableName } from 'drizzle-orm'
import { integer, pgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { composeRelations } from './composeRelations'
import { defineModuleSchema } from './defineModuleSchema'

function schema() {
  const people = pgTable('projects__people', { id: integer().primaryKey() })
  const work = pgTable('projects__work', {
    id: integer().primaryKey(),
    people: integer(),
    reviewer: integer(),
    parent: integer()
  })
  const labels = pgTable('projects__labels', { id: integer().primaryKey() })
  const links = pgTable('projects__links', {
    work: integer(),
    label: integer()
  })
  return defineModuleSchema(
    { people, work, labels, links },
    r => ({
      work: {
        owner: r.one.people({
          from: r.work.people,
          to: r.people.id,
          alias: 'owner'
        }),
        reviewedBy: r.one.people({
          from: r.work.reviewer,
          to: r.people.id,
          alias: 'reviewer'
        }),
        parentItem: r.one.work({
          from: r.work.parent,
          to: r.work.id,
          alias: 'tree'
        }),
        children: r.many.work({ alias: 'tree' }),
        labels: r.many.labels({
          from: r.work.id.through(r.links.work),
          to: r.labels.id.through(r.links.label)
        })
      },
      people: {
        owned: r.many.work({ alias: 'owner' }),
        reviewed: r.many.work({ alias: 'reviewer' })
      }
    }),
    'monolith--projects'
  )
}

describe('composed database relations', () => {
  it('keeps local aliases while resolving joins to installed table names', () => {
    const declared = schema()
    const built = composeRelations([declared]) as Record<string, any>
    expect(Object.keys(built).sort()).toEqual([
      'projects__labels',
      'projects__links',
      'projects__people',
      'projects__work'
    ])
    expect(declared.keyMap).toMatchObject({
      people: 'projects__people',
      work: 'projects__work'
    })
    const relationships = built.projects__work.relations
    expect(relationships.owner.targetTableName).toBe('projects__people')
    expect(relationships.owner.sourceColumns[0].name).toBe('people')
    expect(relationships.reviewedBy.sourceColumns[0].name).toBe('reviewer')
    expect(relationships.children.targetTableName).toBe('projects__work')
    expect(relationships.parentItem.targetTableName).toBe('projects__work')
    expect(getTableName(relationships.labels.throughTable)).toBe(
      'projects__links'
    )
    expect(built.projects__people.relations.owned.targetTableName).toBe(
      'projects__work'
    )
  })

  it('preserves core table identities and does not change input objects', () => {
    const table = pgTable('accounts', { id: integer().primaryKey() })
    const tables = { accounts: table }
    const relations = () => ({})
    const core = defineModuleSchema(tables, relations)
    expect(core.tables).toBe(tables)
    expect(core.relations).toBe(relations)
    expect(core.keyMap).toBeUndefined()
    defineModuleSchema(tables, relations, 'monolith--probe')
    expect(Object.keys(tables)).toEqual(['accounts'])
    expect(getTableName(table)).toBe('accounts')
  })

  it('rejects incompatible registrations instead of silently overwriting a table', () => {
    const first = defineModuleSchema(
      { notes: pgTable('notes', { id: integer().primaryKey() }) },
      () => ({})
    )
    const second = defineModuleSchema(
      { notes: pgTable('notes', { id: integer().primaryKey() }) },
      () => ({})
    )
    expect(() => composeRelations([first, second])).toThrow(
      'Conflicting table registration: notes'
    )
    expect(() =>
      defineModuleSchema(
        {
          a: pgTable('duplicate', { id: integer() }),
          b: pgTable('duplicate', { id: integer() })
        },
        () => ({}),
        'monolith--duplicate'
      )
    ).toThrow('Duplicate database table')
  })
})
