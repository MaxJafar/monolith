import { describe, expect, it } from 'vitest'

import { type Exercise, exerciseSchema } from '../../../shared'
import {
  exerciseEquipment,
  indexExercises,
  searchExercises
} from './exerciseSearch'

function exercise(id: number, overrides: Partial<Exercise> = {}): Exercise {
  return exerciseSchema.parse({
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    name: 'Bench press',
    muscle_group: 'chest',
    equipment: 'Barbell',
    instructions: 'Keep shoulders stable.',
    custom: false,
    archived: false,
    catalog_key: 'bench',
    revision: 1,
    ...overrides
  })
}

const catalog = [
  exercise(1),
  exercise(2, {
    name: 'Custom row',
    muscle_group: 'back',
    equipment: 'Dumbbell',
    custom: true,
    catalog_key: null,
    instructions: 'Pull slowly. 慢慢拉起'
  }),
  exercise(3, {
    name: 'Archived press',
    archived: true,
    equipment: 'Smith machine'
  }),
  exercise(4, {
    name: 'Push up',
    equipment: '',
    instructions: 'Bodyweight control.'
  })
]

describe('indexed Gym catalog search', () => {
  it('keeps case-insensitive, trimmed name, equipment, muscle and instruction matches including Chinese text', () => {
    const index = indexExercises(catalog)

    expect(searchExercises(index, { search: '  bENCh  ' })).toEqual([
      catalog[0]
    ])
    expect(searchExercises(index, { search: 'Dumbbell' })).toEqual([catalog[1]])
    expect(searchExercises(index, { search: 'back' })).toEqual([catalog[1]])
    expect(searchExercises(index, { search: 'shoulders' })).toEqual([
      catalog[0]
    ])
    expect(searchExercises(index, { search: '慢慢拉起' })).toEqual([catalog[1]])
  })
  it('preserves archived/custom/muscle intersections and the catalog order', () => {
    const index = indexExercises(catalog)

    expect(searchExercises(index, {})).toEqual([
      catalog[0],
      catalog[1],
      catalog[3]
    ])
    expect(
      searchExercises(index, { search: 'press', showArchived: true })
    ).toEqual([catalog[0], catalog[2]])
    expect(
      searchExercises(index, { customOnly: true, muscle: 'back' })
    ).toEqual([catalog[1]])
    expect(
      searchExercises(index, { customOnly: true, muscle: 'chest' })
    ).toEqual([])
  })
  it('derives equipment options from current matches without excluding those matches first', () => {
    const index = indexExercises(catalog)
    const matching = searchExercises(index, {
      muscle: 'chest',
      showArchived: true
    })

    expect(exerciseEquipment(matching)).toEqual(['Barbell', 'Smith machine'])
    expect(exerciseEquipment([...matching, catalog[0]!])).toEqual([
      'Barbell',
      'Smith machine'
    ])
  })
  it('retains original exercise references for actions and rebuilds after catalog edits', () => {
    const original = catalog[0]!
    const indexed = indexExercises([original])

    expect(searchExercises(indexed, { search: 'bench' })[0]).toBe(original)
    const updated = { ...original, name: 'Renamed incline press' }
    const rebuilt = indexExercises([updated])

    expect(searchExercises(rebuilt, { search: 'bench' })).toEqual([])
    expect(searchExercises(rebuilt, { search: 'incline' })[0]).toBe(updated)
    expect(original.name).toBe('Bench press')
  })
  it('reads long instructions once per index rather than again for every typed query', () => {
    let reads = 0

    const item = exercise(5)
    Object.defineProperty(item, 'instructions', {
      get: () => {
        reads++

        return 'Shoulder stability '.repeat(500)
      }
    })
    const index = indexExercises([item])
    const indexedReads = reads

    for (const search of ['s', 'sh', 'sho', 'shoulder'])
      expect(searchExercises(index, { search })).toEqual([item])
    expect(reads).toBe(indexedReads)
    expect(indexedReads).toBe(1)
  })
})
