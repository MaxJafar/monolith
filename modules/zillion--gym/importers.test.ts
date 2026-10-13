import { describe, expect, it } from 'vitest'

import { type GymImportOptions, parseGymCSV, parseGymImport } from './importers'
import { type Exercise, backupSchema, exerciseSchema } from './shared'

const bench = exerciseSchema.parse({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bench Press',
  mode: 'reps',
  muscle_group: 'chest',
  equipment: 'barbell',
  custom: false,
  archived: false,
  catalog_key: '0025',
  revision: 1
})
const plank = exerciseSchema.parse({
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Plank',
  mode: 'time',
  muscle_group: 'core',
  equipment: 'body weight',
  custom: false,
  archived: false,
  catalog_key: 'plank',
  revision: 1
})
const run = exerciseSchema.parse({
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Running',
  mode: 'cardio',
  muscle_group: 'cardio',
  equipment: 'treadmill',
  custom: false,
  archived: false,
  catalog_key: 'run',
  revision: 1
})

function options(
  exercises: Exercise[] = [bench, plank, run]
): GymImportOptions {
  let counter = 0

  return {
    exercises,
    now: '2026-10-12T12:00:00.000Z',
    createId: () =>
      `10000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
  }
}

const androidHeader =
  'Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time,Comment'
const strongHeader =
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE'
const hevyHeader =
  'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe'

describe('CSV syntax', () => {
  it('reads BOM, quoted commas, doubled quotes, embedded newlines and CRLF', () => {
    expect(
      parseGymCSV(
        '\uFEFFDate,Note\r\n2026-10-12,"First, line\nSecond ""quote"""\r\n'
      )
    ).toEqual([
      ['Date', 'Note'],
      ['2026-10-12', 'First, line\nSecond "quote"']
    ])
  })
  it.each([
    'Date,Note\n2026-10-12,"open',
    'Date,Note\n2026-10-12,"closed"extra',
    'Date,Note\n2026-10-12,un"quoted'
  ])('rejects malformed quoting: %s', text => {
    expect(() => parseGymCSV(text)).toThrow()
  })
  it('preserves empty trailing columns and ignores genuinely empty lines', () => {
    expect(parseGymCSV('a,b,c\n\n1,2,\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '']
    ])
  })
})

describe('workout CSV adapters', () => {
  it('reads FitNotes Android with exact exercise matching and completed sets', () => {
    const preview = parseGymImport(
      `${androidHeader}\n2026-10-12,Bench Press,Chest,50,kg,8,,,,`,
      options()
    )
    expect(preview.source).toBe('FitNotes Android')
    expect(preview.counts).toMatchObject({
      workouts: 1,
      sets: 1,
      matched_exercises: 1,
      custom_exercises: 0,
      skipped_rows: 0
    })
    expect(preview.data.workouts[0].entries[0]).toMatchObject({
      exercise_id: bench.id,
      target: { mode: 'reps' },
      sets: [{ weight_kg: 50, reps: 8, done: true }]
    })
  })
  it('reads FitNotes iOS pounds and retains set type and notes', () => {
    const text =
      'Date,Exercise,Category,Weight (kg),Weight (lbs),Reps,Distance,Distance Unit,Time,Notes,Kind\n2026-10-12,Bench Press,Chest,,100,8,,,,Felt good,Normal'
    const preview = parseGymImport(text, options())
    expect(preview.source).toBe('FitNotes iOS')
    expect(preview.data.workouts[0].entries[0].sets[0].weight_kg).toBeCloseTo(
      45.359237,
      5
    )
    expect(preview.data.workouts[0].notes).toContain('Felt good')
    expect(preview.counts.converted_rows).toBe(1)
  })
  it('reads Strong session duration separately from rep-set duration and preserves RPE', () => {
    const text = `${strongHeader}\n2026-10-12 08:00:00,Push,1h 15m,Bench Press,1,50,8,,,Good,Push day,8\n2026-10-12 08:00:00,Push,1h 15m,Bench Press,2,50,7,,,,,0`
    const preview = parseGymImport(text, options())
    const workout = preview.data.workouts[0]
    expect(preview.source).toBe('Strong')
    expect(workout.finished_at).toBe('2026-10-12T09:15:00.000Z')
    expect(workout.entries[0].sets).toMatchObject([
      { reps: 8, seconds: 0, rpe: 8 },
      { reps: 7, rpe: null }
    ])
    expect(preview.counts.rpe_sets).toBe(1)
  })
  it('reads Hevy cardio distance/duration/speed and supersets', () => {
    const text = `${hevyHeader}\nCardio,2026-10-12T08:00:00Z,2026-10-12T09:00:00Z,,Running,pair,,0,normal,0,0,1,300,`
    const preview = parseGymImport(text, options())
    expect(preview.source).toBe('Hevy')
    expect(preview.data.workouts[0].entries[0]).toMatchObject({
      superset_group: 'pair',
      target: { mode: 'cardio' },
      sets: [{ minutes: 5, speed_kmh: 12, seconds: 0 }]
    })
    expect(preview.data.workouts[0].notes).toContain('1 km')
  })
  it('keeps a loaded timed hold distinct from cardio', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps,Seconds\n2026-10-12,Plank,5,0,38',
      options()
    )
    expect(preview.data.workouts[0].entries[0]).toMatchObject({
      target: { mode: 'time' },
      sets: [{ weight_kg: 5, seconds: 38, minutes: 0 }]
    })
  })
  it('does not fuzzy-match a different movement; preserves Unicode custom names', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press Machine,50,8\n2026-10-12,Élévation spéciale,5,12',
      options()
    )
    expect(preview.unmatched_names).toEqual([
      'Bench Press Machine',
      'Élévation spéciale'
    ])
    expect(preview.counts.custom_exercises).toBe(2)
    expect(preview.data.exercises.every(exercise => exercise.custom)).toBe(true)
  })
  it('treats an ambiguous catalog name as custom instead of selecting arbitrarily', () => {
    const duplicate = {
      ...bench,
      id: '00000000-0000-4000-8000-000000000004',
      catalog_key: 'other'
    }
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,50,8',
      options([bench, duplicate])
    )
    expect(preview.data.exercises[0].custom).toBe(true)
    expect(
      preview.warnings.some(warning => warning.code === 'ambiguous_exercise')
    ).toBe(true)
  })
  it('converts mixed kg/lb per row rather than applying a file-wide unit', () => {
    const preview = parseGymImport(
      `${androidHeader}\n2026-10-12,Bench Press,Chest,50,kg,8,,,,\n2026-10-12,Bench Press,Chest,100,lb,8,,,,`,
      options()
    )
    expect(
      preview.data.workouts[0].entries[0].sets.map(set => set.weight_kg)
    ).toEqual([50, 45.359237])
    expect(preview.counts.converted_rows).toBe(1)
  })
  it('retains RIR zero and rejects two simultaneous effort scales without changing valid rows', () => {
    const text =
      'Date,Exercise,Weight (kg),Reps,RIR,RPE\n2026-10-12,Bench Press,50,8,0,\n2026-10-12,Bench Press,50,8,1,8'
    const preview = parseGymImport(text, options())
    expect(preview.data.workouts[0].entries[0].sets).toHaveLength(1)
    expect(preview.data.workouts[0].entries[0].sets[0].rir).toBe(0)
    expect(preview.counts).toMatchObject({
      skipped_rows: 1,
      rir_sets: 1,
      rpe_sets: 0
    })
  })
  it.each(['-5', 'NaN', 'Infinity', '12kg'])(
    'flags invalid numeric load %s',
    load => {
      const preview = parseGymImport(
        `Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,${load},8\n2026-10-12,Bench Press,50,8`,
        options()
      )
      expect(preview.counts).toMatchObject({ sets: 1, skipped_rows: 1 })
      expect(
        preview.warnings.find(warning => warning.code === 'invalid_row')?.row
      ).toBe(2)
    }
  )
  it('rejects impossible civil dates without rolling them into March', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2024-02-30,Bench Press,50,8\n2024-02-29,Bench Press,50,8',
      options()
    )
    expect(preview.data.workouts[0].date).toBe('2024-02-29')
    expect(preview.counts.skipped_rows).toBe(1)
  })
  it('preserves source civil date and converts offset timestamps to instants', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12 23:30:00 -0400,Bench Press,50,8',
      options()
    )
    expect(preview.data.workouts[0]).toMatchObject({
      date: '2026-10-12',
      started_at: '2026-10-13T03:30:00.000Z'
    })
  })
  it('resolves naive source timestamps using the selected timezone across the spring transition', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-03-08 01:30:00,Bench Press,50,8\n2026-03-08 03:30:00,Bench Press,50,8',
      { ...options(), timezone: 'America/New_York' }
    )
    expect(preview.data.workouts.map(workout => workout.started_at)).toEqual([
      '2026-03-08T06:30:00.000Z',
      '2026-03-08T07:30:00.000Z'
    ])
    expect(preview.data.workouts.map(workout => workout.date)).toEqual([
      '2026-03-08',
      '2026-03-08'
    ])
    expect(
      preview.warnings.find(warning => warning.code === 'source_timezone')
        ?.message
    ).toContain('America/New_York')
  })
  it.each([
    ['2026-03-08 02:30:00', 'Nonexistent'],
    ['2026-11-01 01:30:00', 'Ambiguous']
  ])('flags %s instead of guessing a DST instant', (date, reason) => {
    const preview = parseGymImport(
      `Date,Exercise,Weight (kg),Reps\n${date},Bench Press,50,8\n2026-03-09 09:00:00,Bench Press,50,8`,
      { ...options(), timezone: 'America/New_York' }
    )
    expect(preview.counts).toMatchObject({ workouts: 1, skipped_rows: 1 })
    expect(
      preview.warnings.find(warning => warning.code === 'invalid_row')?.message
    ).toContain(reason)
  })
  it('uses explicit source offsets to distinguish both occurrences of a repeated clock time', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-11-01T01:30:00-04:00,Bench Press,50,8\n2026-11-01T01:30:00-05:00,Bench Press,50,8',
      { ...options(), timezone: 'America/New_York' }
    )
    expect(preview.data.workouts.map(workout => workout.started_at)).toEqual([
      '2026-11-01T05:30:00.000Z',
      '2026-11-01T06:30:00.000Z'
    ])
    expect(preview.counts.skipped_rows).toBe(0)
  })
  it('handles quarter-hour timezone offsets and subsecond source clocks', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-01-01T00:15:00.125,Bench Press,50,8',
      { ...options(), timezone: 'Asia/Kathmandu' }
    )
    expect(preview.data.workouts[0]).toMatchObject({
      date: '2026-01-01',
      started_at: '2025-12-31T18:30:00.125Z'
    })
  })
  it('rejects invalid source timezones before processing any import rows', () => {
    expect(() =>
      parseGymImport('Date,Weight (kg)\n2026-10-12,70', {
        ...options(),
        timezone: 'Invalid/Zone'
      })
    ).toThrow('Invalid source timezone')
  })
  it('reads human month names and PM without relying on host date parsing', () => {
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n"Oct 12, 2026, 8:30 PM",Bench Press,50,8',
      options()
    )
    expect(preview.data.workouts[0].started_at).toBe('2026-10-12T20:30:00.000Z')
  })
  it('requires an explicit order for ambiguous spreadsheet dates', () => {
    expect(() =>
      parseGymImport(
        'Date,Exercise,Weight (kg),Reps\n03/04/2026,Bench Press,50,8',
        options()
      )
    ).toThrow('No valid records')
    const preview = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n03/04/2026,Bench Press,50,8',
      { ...options(), dateOrder: 'day-first' }
    )
    expect(preview.data.workouts[0].date).toBe('2026-04-03')
  })
  it('retains two distinct same-day sessions and previews duplicate content independently of IDs', () => {
    const text =
      'Date,Exercise,Workout Name,Weight (kg),Reps\n2026-10-12 08:00:00,Bench Press,Morning,50,8\n2026-10-12 18:00:00,Bench Press,Evening,50,8'
    const first = parseGymImport(text, options())
    const next = parseGymImport(text, {
      ...options(),
      existingWorkouts: first.data.workouts
    })
    expect(first.data.workouts).toHaveLength(2)
    expect(next.counts.duplicates).toBe(2)
    expect(next.data.workouts).toHaveLength(2)
  })
  it('reports mismatched columns and unknown units instead of shifting or guessing them', () => {
    const text =
      'Date,Exercise,Weight,Weight Unit,Reps\n2026-10-12,Bench Press,50,stones,8\n2026-10-12,Bench Press,50,kg,8,extra\n2026-10-12,Bench Press,50,kg,8'
    const preview = parseGymImport(text, options())
    expect(preview.counts).toMatchObject({ skipped_rows: 2, sets: 1 })
  })
  it('does not leak changes from a rejected 51st set into the imported session', () => {
    const text =
      'Date,Exercise,Weight (kg),Reps\n' +
      Array.from({ length: 51 }, () => '2026-10-12,Bench Press,50,8').join('\n')
    const preview = parseGymImport(text, options())
    expect(preview.data.workouts[0].entries[0].sets).toHaveLength(50)
    expect(preview.counts.skipped_rows).toBe(1)
  })
})

describe('body-weight imports', () => {
  it('selects the latest same-day CSV reading regardless of row order and previews existing dates', () => {
    const text =
      'Date,Weight (kg)\n2026-10-12 18:00:00,75\n2026-10-12 08:00:00,74\n2026-10-13,76'
    const preview = parseGymImport(text, {
      ...options(),
      existingBodyweight: [{ date: '2026-10-12' }]
    })
    expect(preview.source).toBe('Bodyweight CSV')
    expect(
      preview.data.bodyweight.map(weight => [weight.date, weight.weight_kg])
    ).toEqual([
      ['2026-10-12', 75],
      ['2026-10-13', 76]
    ])
    expect(preview.counts.duplicates).toBe(1)
  })
  it('reads reordered/single-quoted Apple Health attributes and mixed units per record', () => {
    const xml = `<HealthData><Record value='100' unit='lb' startDate='2026-10-12 08:00:00 -0400' type='HKQuantityTypeIdentifierBodyMass'/><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-13 08:00:00 -0400" unit="kg" value="70"/></HealthData>`
    const preview = parseGymImport(xml, options())
    expect(preview.source).toBe('Apple Health')
    expect(preview.data.bodyweight.map(weight => weight.weight_kg)).toEqual([
      45.359237, 70
    ])
    expect(preview.counts.converted_rows).toBe(1)
  })
  it('ignores other Health records, comments and CDATA and permits an inert normal DTD', () => {
    const xml = `<!DOCTYPE HealthData [<!ELEMENT HealthData ANY>]><HealthData><!--<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-12" unit="kg" value="900"/>--><![CDATA[<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-12" unit="kg" value="800"/>]]><Record type="HKQuantityTypeIdentifierStepCount" value="999"/><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-12" unit="kg" value="70"/></HealthData>`
    const preview = parseGymImport(xml, options())
    expect(preview.counts.bodyweight).toBe(1)
    expect(preview.data.bodyweight[0].weight_kg).toBe(70)
  })
  it('keeps the latest same-day Health reading and flags invalid records', () => {
    const xml = `<HealthData><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-12 18:00:00Z" unit="kg" value="75"/><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-10-12 08:00:00Z" unit="kg" value="74"/><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-02-30" unit="kg" value="70"/></HealthData>`
    const preview = parseGymImport(xml, options())
    expect(preview.data.bodyweight[0].weight_kg).toBe(75)
    expect(preview.counts.skipped_rows).toBe(1)
  })
  it('rejects entity declarations without resolving any external content', () => {
    expect(() =>
      parseGymImport(
        '<!DOCTYPE HealthData [<!ENTITY x SYSTEM "file:///secret">]><HealthData/>',
        options()
      )
    ).toThrow('entity declarations')
  })
})

describe('JSON plan and backup adapters', () => {
  it('maps OpenGym catalog/custom/routine IDs and preserves plan rules, supersets and rest days', () => {
    const raw = {
      opengym_plan: 1,
      routines: [
        {
          id: 'r1',
          name: 'Mixed',
          prog: 'double',
          ex: [
            {
              id: '0025',
              sets: 3,
              reps: 10,
              repsMin: 8,
              weight: 50,
              inc: 2.5,
              sg: 'pair'
            },
            {
              id: 'c1',
              mode: 'time',
              sec: 45,
              sets: 2,
              weight: 5,
              prog: 'time',
              sg: 'pair'
            }
          ]
        }
      ],
      customEx: [
        { id: 'c1', n: 'My hold', bp: 'waist', desc: 'Use my own timer' }
      ],
      week: { 1: 'r1', 2: 'rest' }
    }
    const preview = parseGymImport(JSON.stringify(raw), options())
    expect(preview.source).toBe('OpenGym plan')
    expect(preview.data.workouts).toEqual([])
    expect(preview.has_settings).toBe(false)
    expect(preview.data.routines[0].entries[0]).toMatchObject({
      exercise_id: bench.id,
      prescription: { progression: null, reps_min: 8, increment: 2.5 }
    })
    expect(preview.data.routines[0].entries[1]).toMatchObject({
      superset_group: 'pair',
      prescription: { mode: 'time', seconds: 45, progression: 'time' }
    })
    expect(preview.data.schedule[0].routine_id).toBe(
      preview.data.routines[0].id
    )
    expect(preview.data.schedule[1].routine_id).toBeNull()
  })
  it('imports OpenGym history/settings in canonical kilograms and omits active/Coach authorization', () => {
    const raw = {
      unit: 'lb',
      routines: [],
      week: {},
      dayPlan: { '2026-10-12': 'rest' },
      bodyweight: [{ d: '2026-10-12', w: 100 }],
      active: { id: 'active' },
      coach: { consent: { agreedAt: 1 } },
      workouts: [
        {
          id: 'old',
          d: '2026-10-12',
          name: 'Push',
          start: 1791792000000,
          end: 1791795600000,
          entries: [
            {
              id: '0025',
              target: { sets: 2, reps: 8, weight: 100, prog: 'linear' },
              sets: [
                { w: 100, r: 8, done: true, rir: 0 },
                { w: 100, r: 6, done: false }
              ]
            }
          ]
        }
      ]
    }
    const preview = parseGymImport(JSON.stringify(raw), options())
    expect(preview.source).toBe('OpenGym backup')
    expect(preview.data.workouts[0].entries[0].sets).toMatchObject([
      { weight_kg: 45.359237, rir: 0, done: true },
      { reps: 6, done: false }
    ])
    expect(preview.data.bodyweight[0].weight_kg).toBe(45.359237)
    expect(preview.data.settings?.unit).toBe('lb')
    expect(preview.warnings.map(warning => warning.code)).toEqual(
      expect.arrayContaining(['active_not_imported', 'coach_not_imported'])
    )
    expect(preview.has_schedule).toBe(true)
  })
  it('validates native backup round-trips without mutating the caller snapshot', () => {
    const original = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,50,8',
      options()
    )
    const before = JSON.stringify(original.data)
    const preview = parseGymImport(before, options())
    expect(preview.source).toBe('ZillionOS JSON')
    expect(backupSchema.safeParse(preview.data).success).toBe(true)
    expect(JSON.stringify(original.data)).toBe(before)
    expect(preview.data.workouts[0].entries[0].sets[0].weight_kg).toBe(50)
  })
  it('preserves native active-session timer references for a complete restore', () => {
    const data = parseGymImport(
      'Date,Exercise,Weight (kg),Reps,Seconds\n2026-10-12,Plank,0,0,45',
      options()
    ).data
    const workout = data.workouts[0]
    workout.status = 'active'
    workout.finished_at = null
    workout.current_entry_id = workout.entries[0].id
    workout.rest_until = '2026-10-12T12:01:30.000Z'
    workout.work_timer = {
      entry_id: workout.entries[0].id,
      set_id: workout.entries[0].sets[0].id,
      started_at: workout.started_at,
      target_seconds: 45
    }
    const preview = parseGymImport(JSON.stringify(data), options())
    expect(preview.data.workouts[0]).toMatchObject({
      status: 'active',
      finished_at: null,
      current_entry_id: workout.current_entry_id,
      rest_until: workout.rest_until,
      work_timer: workout.work_timer
    })
    expect(
      preview.warnings.some(warning => warning.code === 'native_active_session')
    ).toBe(true)
  })
  it.each(['owner_id', 'user_id', 'api_key', '__proto__'])(
    'rejects embedded sensitive field %s',
    key => {
      const text = `{"routines":[],"workouts":[],"${key}":"forged"}`
      expect(() => parseGymImport(text, options())).toThrow(
        'Forbidden import field'
      )
    }
  )
  it('rejects unknown plan versions and dangling schedule references', () => {
    expect(() =>
      parseGymImport('{"opengym_plan":2,"routines":[]}', options())
    ).toThrow('version')
    expect(() =>
      parseGymImport(
        '{"opengym_plan":1,"routines":[],"week":{"1":"missing"}}',
        options()
      )
    ).toThrow('unknown routine')
  })
  it('rejects invalid native history references before the confirmation step', () => {
    const original = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,50,8',
      options()
    )
    original.data.exercises = []
    expect(() =>
      parseGymImport(JSON.stringify(original.data), options())
    ).toThrow('unknown exercise')
  })
  it.each([null, '2026-10-11T12:00:00.000Z'])(
    'rejects a completed native workout with invalid finish %s',
    finish => {
      const data = parseGymImport(
        'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,50,8',
        options()
      ).data
      data.workouts[0].finished_at = finish
      expect(() => parseGymImport(JSON.stringify(data), options())).toThrow(
        'Completed workout end'
      )
    }
  )
  it('rejects conflicting exercise IDs rather than silently replacing a catalog entry', () => {
    const data = parseGymImport(
      'Date,Exercise,Weight (kg),Reps\n2026-10-12,Bench Press,50,8',
      options()
    ).data
    data.exercises.push({ ...data.exercises[0], name: 'Different movement' })
    expect(() => parseGymImport(JSON.stringify(data), options())).toThrow(
      'Duplicate exercise IDs'
    )
  })
  it('reports the assumed source unit for OpenGym plans before importing loads', () => {
    const raw = {
      opengym_plan: 1,
      routines: [{ id: 'r', name: 'Push', ex: [{ id: '0025', weight: 100 }] }]
    }
    const preview = parseGymImport(JSON.stringify(raw), {
      ...options(),
      unit: 'lb'
    })
    expect(preview.data.routines[0].entries[0].prescription.weight_kg).toBe(
      45.359237
    )
    expect(
      preview.warnings.find(warning => warning.code === 'assumed_unit')?.message
    ).toContain('lb')
  })
  it('keeps punctuation-distinct names custom and counts only accepted unit conversions', () => {
    const source =
      'Date,Exercise,Weight,Weight Unit,Reps\n2026-10-12,Bench+Press,100,lb,8\n2026-10-12,Bench Press,100,lb,invalid'
    const preview = parseGymImport(source, options())
    expect(preview.unmatched_names).toEqual(['Bench+Press'])
    expect(preview.data.exercises[0].custom).toBe(true)
    expect(preview.counts).toMatchObject({
      converted_rows: 1,
      sets: 1,
      skipped_rows: 1
    })
  })
  it('rejects oversized, empty and malformed files before producing an import payload', () => {
    expect(() =>
      parseGymImport(' '.repeat(25 * 1024 * 1024 + 1), options())
    ).toThrow('25 MiB')
    expect(() => parseGymImport(' ', options())).toThrow('empty')
    expect(() => parseGymImport('{broken', options())).toThrow()
  })
})
