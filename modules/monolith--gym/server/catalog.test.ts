import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import z from 'zod'

import chineseInstructions from '../catalog-zh.json'
import rawCatalog from '../catalog.json'
import { exerciseInputSchema, muscleGroupSchema } from '../shared'

const sourceFields = [
  'catalog_key',
  'equipment',
  'instructions',
  'mode',
  'muscle_group',
  'name',
  'secondary_muscles'
].sort()
const catalogSchema = z.array(
  exerciseInputSchema
    .extend({ catalog_key: z.string().regex(/^\d{4}$/) })
    .strict()
)

function exercise(id: string) {
  const item = rawCatalog.find(value => value.catalog_key === id)

  if (!item) throw new Error(`Missing pinned exercise ${id}`)

  return item
}

describe('Pinned non-media exercise catalog', () => {
  it('contains 1,324 uniquely identified exercises that satisfy native input constraints', () => {
    expect(rawCatalog).toHaveLength(1324)
    expect(new Set(rawCatalog.map(value => value.catalog_key)).size).toBe(1324)
    expect(catalogSchema.safeParse(rawCatalog).success).toBe(true)
  })

  it.each([
    ['0001', 'core'],
    ['1512', 'quadriceps'],
    ['0007', 'back'],
    ['1368', 'calves'],
    ['3294', 'chest'],
    ['3214', 'glutes'],
    ['0016', 'hamstrings'],
    ['0018', 'triceps'],
    ['3220', 'cardio'],
    ['0968', 'biceps'],
    ['0977', 'shoulders'],
    ['0994', 'forearms']
  ])('represents source primary group %s as %s', (id, group) => {
    expect(exercise(id).muscle_group).toBe(group)
  })

  it('covers every concrete primary group without inventing a full-body source target', () => {
    // The dataset has specific targets; full-body remains available for custom/fallback exercises.
    const concreteGroups = muscleGroupSchema.options.filter(
      group => group !== 'full-body'
    )
    expect(
      [...new Set(rawCatalog.map(value => value.muscle_group))].sort()
    ).toEqual([...concreteGroups].sort())

    for (const item of rawCatalog) {
      expect(muscleGroupSchema.safeParse(item.muscle_group).success).toBe(true)
      expect(
        item.secondary_muscles.every(
          group => muscleGroupSchema.safeParse(group).success
        )
      ).toBe(true)
      expect(new Set(item.secondary_muscles).size).toBe(
        item.secondary_muscles.length
      )
    }
  })

  it.each([
    ['0025', 'barbell bench press', 'chest', ['triceps', 'shoulders']],
    ['0027', 'barbell bent over row', 'back', ['biceps', 'forearms']],
    ['0031', 'barbell curl', 'biceps', ['forearms']],
    ['0061', 'barbell lying triceps extension', 'triceps', ['shoulders']],
    ['0334', 'dumbbell lateral raise', 'shoulders', ['back']],
    ['0599', 'lever seated leg curl', 'hamstrings', ['calves']],
    ['1372', 'barbell standing calf raise', 'calves', ['hamstrings', 'glutes']]
  ])(
    'keeps primary and secondary roles separate for %s %s',
    (id, name, primary, secondary) => {
      expect(exercise(id)).toMatchObject({
        name,
        muscle_group: primary,
        secondary_muscles: secondary,
        mode: 'reps'
      })
    }
  )

  it('contains instruction text and taxonomy only, with no media URLs, embeds or asset paths', () => {
    for (const item of rawCatalog)
      expect(Object.keys(item).sort()).toEqual(sourceFields)

    const serialized = JSON.stringify([rawCatalog, chineseInstructions])
    expect(serialized).not.toMatch(
      /https?:\/\/|data:|\/(?:images|videos)\/|\.(?:gif|webm|mp4|png|jpe?g)(?:\b|[?#])/i
    )
    expect(serialized).not.toMatch(/<(?:img|video|iframe|svg)\b/i)
  })

  it('pairs every pinned exercise with nonempty Chinese instruction text', () => {
    expect(Object.keys(chineseInstructions).sort()).toEqual(
      rawCatalog.map(value => value.catalog_key).sort()
    )
    const translated = new Map(Object.entries(chineseInstructions))

    for (const item of rawCatalog)
      expect(translated.get(item.catalog_key)?.trim().length).toBeGreaterThan(0)
  })

  it('retains the pinned dataset provenance, MIT attribution and separate media exception', () => {
    const notice = readFileSync(
      new URL('../NOTICE.md', import.meta.url),
      'utf8'
    )
    expect(notice).toContain('hasaneyldrm/exercises-dataset')
    expect(notice).toContain('7455efae41b330c265e7cd4b78dfa848e7ce5ebd')
    expect(notice).toContain('MIT License')
    expect(notice).toContain('Copyright (c) 2026 Hasan Emir Yıldırım')
    expect(notice).toContain(
      'The above copyright notice and this permission notice shall be included'
    )
    expect(notice).toContain('MEDIA EXCEPTION')
    expect(notice).toContain('does not distribute')
  })
})
