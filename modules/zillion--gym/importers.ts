import {
  type Exercise,
  type ExerciseMode,
  type GymBackup,
  type MuscleGroup,
  type Prescription,
  type Routine,
  type Unit,
  type Workout,
  type WorkoutEntry,
  type WorkoutSet,
  backupSchema,
  bodyweightSchema,
  exerciseInputSchema,
  exerciseSchema,
  isoDateSchema,
  prescriptionSchema,
  routineSchema,
  scheduleSchema,
  setSchema,
  settingsSchema,
  toKilograms,
  workoutSchema
} from './shared'

/** Independent format adapters. No upstream runtime, filesystem or network dependency. */
export type ImportSource =
  | 'ZillionOS JSON'
  | 'OpenGym backup'
  | 'OpenGym plan'
  | 'FitNotes Android'
  | 'FitNotes iOS'
  | 'Strong'
  | 'Hevy'
  | 'Workout CSV'
  | 'Bodyweight CSV'
  | 'Apple Health'

export type ImportWarning = { code: string; message: string; row?: number }

export type GymImportOptions = {
  exercises: readonly Exercise[]
  unit?: Unit
  now?: string
  createId?: () => string
  dateOrder?: 'day-first' | 'month-first'
  timezone?: string
  existingWorkouts?: readonly Workout[]
  existingBodyweight?: readonly { date: string }[]
}

export type GymImportPreview = {
  data: GymBackup
  source: ImportSource
  counts: {
    rows: number
    skipped_rows: number
    workouts: number
    routines: number
    sets: number
    bodyweight: number
    matched_exercises: number
    custom_exercises: number
    duplicates: number
    converted_rows: number
    rir_sets: number
    rpe_sets: number
    warmup_sets: number
  }
  warnings: ImportWarning[]
  unmatched_names: string[]
  date_range: { from: string; to: string } | null
  has_schedule: boolean
  has_settings: boolean
}

type ObjectValue = Record<string, unknown>

const MAX_CHARS = 25 * 1024 * 1024
const MAX_ROWS = 100000
const normalName = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const exerciseName = (value: string) =>
  value.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim()
const rounded = (value: number) => Math.round(value * 1000000) / 1000000
const object = (value: unknown): ObjectValue => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an object')

  return Object.fromEntries(Object.entries(value))
}
const list = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)

  return value
}
const string = (value: unknown, fallback = '') => {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') throw new Error('Expected text')

  return value.trim()
}
const numeric = (value: unknown, fallback = 0): number => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'number' && typeof value !== 'string')
    throw new Error('Expected a number')
  if (
    typeof value === 'string' &&
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())
  )
    throw new Error(`Invalid number: ${value}`)

  const result = Number(value)

  if (!Number.isFinite(result) || result < 0)
    throw new Error('Numbers must be finite and nonnegative')

  return result
}
const flag = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'boolean') throw new Error('Expected true or false')

  return value
}
const weightUnit = (value: unknown, fallback: Unit): Unit => {
  const unit = string(value).toLowerCase()

  if (!unit) return fallback
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(unit)) return 'kg'
  if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) return 'lb'
  throw new Error(`Unknown weight unit: ${unit}`)
}
const kilograms = (value: unknown, unit: Unit, fallback = 0) =>
  rounded(toKilograms(numeric(value, fallback), unit))
const capture = (match: RegExpExecArray, index: number): string => {
  const value = match[index]

  if (value === undefined) throw new Error('Missing required text capture')

  return value
}

/** Strict CSV state machine, including BOM, CRLF, quoted commas and quoted newlines. */
export function parseGymCSV(text: string): string[][] {
  if (text.length > MAX_CHARS)
    throw new Error('Import exceeds the 25 MiB text limit')

  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []

  let row: string[] = []
  let field = ''
  let state: 'field' | 'quoted' | 'closed' = 'field'

  const cell = () => {
    row.push(field)
    field = ''
    state = 'field'
  }
  const line = () => {
    cell()
    if (row.some(value => value.trim())) rows.push(row)
    row = []
    if (rows.length > MAX_ROWS) throw new Error('Import has too many rows')
  }

  for (let i = 0; i < input.length; i++) {
    const char = input.charAt(i)

    if (state === 'quoted') {
      if (char !== '"') field += char
      else if (input[i + 1] === '"') {
        field += '"'
        i++
      } else state = 'closed'
    } else if (char === ',') cell()
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && input[i + 1] === '\n') i++
      line()
    } else if (state === 'closed') {
      if (!/\s/.test(char))
        throw new Error('Unexpected text after a quoted CSV field')
    } else if (char === '"') {
      if (field) throw new Error('Quote inside an unquoted CSV field')
      state = 'quoted'
    } else field += char
    if (field.length > 10000)
      throw new Error('CSV field exceeds 10000 characters')
  }
  if (state === 'quoted') throw new Error('Unclosed quoted CSV field')
  line()

  return rows
}

function civilDate(value: string): string {
  const parsed = isoDateSchema.safeParse(value)

  if (!parsed.success) throw new Error(`Invalid civil date: ${value}`)

  return parsed.data
}

function timezoneFormatter(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      calendar: 'iso8601',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
  } catch {
    throw new Error(`Invalid source timezone: ${timezone}`)
  }
}

/** Find all instants matching a civil clock, rather than silently normalizing DST transitions. */
function civilInstant(
  clock: string,
  formatter: Intl.DateTimeFormat,
  timezone: string
): string {
  const base = Date.parse(`${clock}Z`)
  const wholeSecond = base - (base % 1000)
  const localClock = (instant: number) => {
    const parts = new Map(
      formatter
        .formatToParts(new Date(instant))
        .map(part => [part.type, part.value])
    )

    return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}T${parts.get('hour')}:${parts.get('minute')}:${parts.get('second')}`
  }
  const offsets = new Set<number>()

  // Both sides of a possible transition, including non-hour and date-line changes.
  for (const shift of [-36, -12, 0, 12, 36]) {
    const sample = wholeSecond + shift * 3600000
    offsets.add(Date.parse(`${localClock(sample)}Z`) - sample)
  }

  const candidates = [...offsets]
    .map(offset => base - offset)
    .filter(instant => localClock(instant) === clock.slice(0, 19))

  if (!candidates.length)
    throw new Error(
      `Nonexistent local time in ${timezone}; supply a timestamp with an explicit offset`
    )
  if (candidates.length !== 1)
    throw new Error(
      `Ambiguous local time in ${timezone}; supply a timestamp with an explicit offset`
    )

  const result = candidates[0]

  if (result === undefined) throw new Error('No local timestamp candidate')

  return new Date(result).toISOString()
}

function when(
  value: string,
  order: GymImportOptions['dateOrder'],
  formatter: Intl.DateTimeFormat,
  timezone: string
): { date: string; instant: string; timed: boolean; naive: boolean } {
  const input = value.trim()
  const iso =
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      input
    )

  let date: string
  let hours = 12,
    minutes = 0,
    seconds = 0,
    fraction = '',
    zone = '',
    timed = false

  if (iso) {
    date = civilDate(capture(iso, 1))

    if (iso[2] !== undefined) {
      hours = Number(iso[2])
      minutes = Number(iso[3])
      seconds = Number(iso[4] || 0)
      fraction = iso[5] ? '.' + iso[5].padEnd(3, '0') : ''
      zone = iso[6] || ''
      timed = true
    }
  } else {
    const numberDate =
      /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[, ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
        input
      )
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec'
    ]
    const dayFirst =
      /^(\d{1,2}) ([A-Za-z]+) (\d{4})(?:[, ]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(
        input
      )
    const monthFirst =
      /^([A-Za-z]+) (\d{1,2}),? (\d{4})(?:[, ]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(
        input
      )

    if (numberDate) {
      const a = Number(numberDate[1]),
        b = Number(numberDate[2])

      if (a <= 12 && b <= 12 && a !== b && !order)
        throw new Error('Ambiguous date; choose day-first or month-first')

      const month = order === 'month-first' || b > 12 ? a : b
      const day = month === a ? b : a
      date = civilDate(
        `${numberDate[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )

      if (numberDate[4]) {
        hours = Number(numberDate[4])
        minutes = Number(numberDate[5])
        seconds = Number(numberDate[6] || 0)
        timed = true
      }
    } else if (dayFirst || monthFirst) {
      const match = dayFirst || monthFirst

      if (!match) throw new Error('Invalid date')

      const month =
        months.indexOf(
          capture(match, dayFirst ? 2 : 1)
            .slice(0, 3)
            .toLowerCase()
        ) + 1
      const day = Number(dayFirst ? match[1] : match[2])
      date = civilDate(
        `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )

      if (match[4]) {
        hours = Number(match[4])
        minutes = Number(match[5])
        seconds = Number(match[6] || 0)
        timed = true

        if (match[7]) {
          if (hours < 1 || hours > 12) throw new Error('Invalid 12-hour time')
          hours = (hours % 12) + (match[7].toUpperCase() === 'PM' ? 12 : 0)
        }
      }
    } else throw new Error(`Unrecognized date: ${input}`)
  }
  if (hours > 23 || minutes > 59 || seconds > 59)
    throw new Error('Invalid time')

  if (zone && zone !== 'Z') {
    const offset = /^([+-])(\d{2}):?(\d{2})$/.exec(zone)

    if (
      !offset ||
      Number(offset[2]) > 14 ||
      Number(offset[3]) > 59 ||
      (Number(offset[2]) === 14 && Number(offset[3]) !== 0)
    )
      throw new Error('Invalid timezone offset')
    zone = `${offset[1]}${offset[2]}:${offset[3]}`
  }

  const clock = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${fraction}`
  const instant = zone
    ? new Date(`${clock}${zone}`).toISOString()
    : civilInstant(clock, formatter, timezone)

  return { date, instant, timed, naive: timed && !zone }
}

function duration(value: string): number {
  if (!value.trim()) return 0

  const clock = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(value.trim())

  if (clock) {
    if (Number(clock[2]) > 59 || Number(clock[3] || 0) > 59)
      throw new Error('Invalid duration')

    return clock[3] === undefined
      ? Number(clock[1]) * 60 + Number(clock[2])
      : Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
  }

  const words =
    /^(?:(\d+(?:\.\d+)?)\s*h\s*)?(?:(\d+(?:\.\d+)?)\s*m\s*)?(?:(\d+(?:\.\d+)?)\s*s\s*)?$/i.exec(
      value.trim()
    )

  if (words && (words[1] || words[2] || words[3]))
    return numeric(words[1]) * 3600 + numeric(words[2]) * 60 + numeric(words[3])

  return numeric(value) * 60
}

function muscle(value: string): MuscleGroup {
  const name = normalName(value)

  if (/cardio|cardiovascular/.test(name)) return 'cardio'
  if (/chest|pectoral/.test(name)) return 'chest'
  if (/back|latiss|lats/.test(name)) return 'back'
  if (/shoulder|delt/.test(name)) return 'shoulders'
  if (/tricep/.test(name)) return 'triceps'
  if (/bicep|upper arm/.test(name)) return 'biceps'
  if (/forearm|lower arm/.test(name)) return 'forearms'
  if (/calf|calves|lower leg/.test(name)) return 'calves'
  if (/hamstring/.test(name)) return 'hamstrings'
  if (/glute|hip/.test(name)) return 'glutes'
  if (/quad|upper leg|leg/.test(name)) return 'quadriceps'
  if (/abs|abdominal|waist|core/.test(name)) return 'core'

  return 'full-body'
}

function forbidSensitive(value: unknown, depth = 0): void {
  if (depth > 30) throw new Error('JSON nesting exceeds the import limit')
  if (!value || typeof value !== 'object') return

  for (const [key, child] of Object.entries(value)) {
    if (
      /^(?:owner_id|user_id|credentials?|access_token|refresh_token|api_key|password|__proto__|constructor|prototype)$/i.test(
        key
      )
    )
      throw new Error(`Forbidden import field: ${key}`)
    forbidSensitive(child, depth + 1)
  }
}

class ImportBuilder {
  readonly warnings: ImportWarning[] = []
  readonly unmatched = new Set<string>()
  readonly matched = new Set<string>()
  readonly used = new Map<string, Exercise>()
  readonly data: GymBackup
  readonly id: () => string
  readonly formatter: Intl.DateTimeFormat
  readonly dates = new Map<string, ReturnType<typeof when>>()
  rows = 0
  skipped = 0
  converted = 0
  warmups = 0
  constructor(readonly options: GymImportOptions) {
    this.formatter = timezoneFormatter(options.timezone || 'UTC')
    this.id = options.createId || (() => crypto.randomUUID())
    this.data = {
      format: 'zillion-gym',
      version: 1,
      exported_at: options.now || new Date().toISOString(),
      exercises: [],
      routines: [],
      schedule: [],
      workouts: [],
      bodyweight: []
    }
  }
  warn(code: string, message: string, row?: number) {
    this.warnings.push({ code, message, ...(row === undefined ? {} : { row }) })
  }
  date(value: string) {
    const prior = this.dates.get(value)

    if (prior) return prior

    const parsed = when(
      value,
      this.options.dateOrder,
      this.formatter,
      this.options.timezone || 'UTC'
    )
    this.dates.set(value, parsed)
    if (
      parsed.naive &&
      !this.warnings.some(warning => warning.code === 'source_timezone')
    )
      this.warn(
        'source_timezone',
        `Timestamps without offsets use the selected source timezone ${this.options.timezone || 'UTC'}`
      )

    return parsed
  }
  resolve(
    name: string,
    mode: ExerciseMode,
    category = '',
    key?: string,
    instructions = ''
  ): Exercise {
    const byKey = key
      ? this.options.exercises.filter(
          exercise => exercise.catalog_key === key || exercise.id === key
        )
      : []
    const byName = this.options.exercises.filter(
      exercise => exerciseName(exercise.name) === exerciseName(name)
    )
    const candidates = byKey.length ? byKey : byName
    const found = candidates.length === 1 ? candidates[0] : undefined

    if (found) {
      this.used.set(found.id, found)
      this.matched.add(found.id)

      return found
    }

    const old = [...this.used.values()].find(
      exercise =>
        exercise.custom &&
        exerciseName(exercise.name) === exerciseName(name) &&
        exercise.mode === mode &&
        exercise.muscle_group === muscle(category)
    )

    if (old) return old

    const exercise = exerciseSchema.parse({
      id: this.id(),
      name,
      mode,
      muscle_group: muscle(category),
      equipment: 'custom',
      instructions,
      custom: true,
      archived: false,
      catalog_key: null,
      revision: 1
    })
    this.used.set(exercise.id, exercise)
    this.unmatched.add(name)
    if (candidates.length > 1)
      this.warn(
        'ambiguous_exercise',
        `Multiple catalog entries match ${name}; retained as a custom exercise`
      )

    return exercise
  }
  prescription(
    raw: ObjectValue,
    mode: ExerciseMode,
    unit: Unit,
    setCount = 3
  ): Prescription {
    return prescriptionSchema.parse({
      mode,
      sets: numeric(raw.sets, setCount),
      reps: numeric(raw.reps, 10),
      reps_min: numeric(raw.repsMin, 8),
      weight_kg: kilograms(raw.weight, unit),
      seconds: numeric(raw.sec, 45),
      minutes: numeric(raw.min, 20),
      speed_kmh: numeric(raw.speed, 8),
      progression: raw.prog ?? null,
      increment:
        raw.inc === undefined || raw.inc === null
          ? null
          : mode === 'time'
            ? numeric(raw.inc)
            : kilograms(raw.inc, unit)
    })
  }
  entry(
    exercise: Exercise,
    mode: ExerciseMode,
    sets: WorkoutSet[],
    target?: Prescription,
    group?: string
  ): WorkoutEntry {
    return {
      id: this.id(),
      position: 0,
      exercise_id: exercise.id,
      exercise: exerciseInputSchema.parse(exercise),
      target:
        target ||
        prescriptionSchema.parse({
          mode,
          sets: sets.length,
          reps: Math.max(1, ...sets.map(set => set.reps)),
          weight_kg: Math.max(0, ...sets.map(set => set.weight_kg)),
          seconds: Math.max(0, ...sets.map(set => set.seconds)),
          minutes: Math.max(0, ...sets.map(set => set.minutes)),
          speed_kmh: Math.max(0, ...sets.map(set => set.speed_kmh))
        }),
      superset_group: group || null,
      suggestion: { policy: 'off', kind: 'off', reason: 'disabled', misses: 0 },
      sets
    }
  }
  workout(
    name: string,
    date: string,
    start: string,
    finish: string,
    entries: WorkoutEntry[],
    notes = '',
    routineId: string | null = null,
    bodyweight: number | null = null
  ): Workout {
    if (new Date(finish).getTime() < new Date(start).getTime())
      throw new Error('Workout end precedes start')

    return workoutSchema.parse({
      id: this.id(),
      routine_id: routineId,
      name,
      date,
      status: 'completed',
      started_at: start,
      finished_at: finish,
      notes,
      bodyweight_kg: bodyweight,
      revision: 1,
      current_entry_id: null,
      rest_until: null,
      work_timer: null,
      entries: entries.map((entry, position) => ({ ...entry, position }))
    })
  }
  finish(source: ImportSource): GymImportPreview {
    this.data.exercises = [...this.used.values()]
    const validated = backupSchema.parse(this.data)
    const exercises = new Set(validated.exercises.map(exercise => exercise.id))
    const routines = new Set(validated.routines.map(routine => routine.id))

    if (routines.size !== validated.routines.length)
      throw new Error('Duplicate routine IDs')
    for (const routine of validated.routines)
      for (const entry of routine.entries)
        if (!exercises.has(entry.exercise_id))
          throw new Error('Routine references an unknown exercise')

    for (const workout of validated.workouts) {
      if (
        (workout.status === 'completed' && !workout.finished_at) ||
        (workout.finished_at &&
          new Date(workout.finished_at).getTime() <
            new Date(workout.started_at).getTime())
      )
        throw new Error('Completed workout end precedes start or is missing')
      if (workout.routine_id && !routines.has(workout.routine_id))
        throw new Error('Workout references an unknown routine')
      for (const entry of workout.entries)
        if (!exercises.has(entry.exercise_id))
          throw new Error('Workout references an unknown exercise')
    }
    for (const item of validated.schedule)
      if (item.routine_id && !routines.has(item.routine_id))
        throw new Error('Schedule references an unknown routine')

    const dates = [
      ...validated.workouts.map(workout => workout.date),
      ...validated.bodyweight.map(weight => weight.date)
    ].sort()
    const sets = validated.workouts.flatMap(workout =>
      workout.entries.flatMap(entry => entry.sets)
    )
    const firstDate = dates[0]
    const lastDate = dates[dates.length - 1]
    const fingerprints = new Set(
      (this.options.existingWorkouts || []).map(workoutFingerprint)
    )

    let duplicates = 0

    for (const workout of validated.workouts) {
      const key = workoutFingerprint(workout)

      if (fingerprints.has(key)) duplicates++
      fingerprints.add(key)
    }

    const weightDates = new Set(
      (this.options.existingBodyweight || []).map(weight => weight.date)
    )

    for (const weight of validated.bodyweight) {
      if (weightDates.has(weight.date)) duplicates++
      weightDates.add(weight.date)
    }
    if (duplicates)
      this.warn(
        'duplicates',
        `${duplicates} existing or repeated records will be skipped by the native merge`
      )

    return {
      data: validated,
      source,
      counts: {
        rows: this.rows,
        skipped_rows: this.skipped,
        workouts: validated.workouts.length,
        routines: validated.routines.length,
        sets: sets.length,
        bodyweight: validated.bodyweight.length,
        matched_exercises: this.matched.size,
        custom_exercises: [...this.used.values()].filter(
          exercise => exercise.custom && this.unmatched.has(exercise.name)
        ).length,
        duplicates,
        converted_rows: this.converted,
        rir_sets: sets.filter(set => set.rir !== null).length,
        rpe_sets: sets.filter(set => set.rpe !== null).length,
        warmup_sets: this.warmups
      },
      warnings: this.warnings,
      unmatched_names: [...this.unmatched].sort(),
      date_range:
        firstDate && lastDate ? { from: firstDate, to: lastDate } : null,
      has_schedule: validated.schedule.length > 0,
      has_settings: validated.settings !== undefined
    }
  }
}

function workoutFingerprint(workout: Workout): string {
  return JSON.stringify([
    workout.date,
    workout.started_at,
    workout.name,
    workout.entries.map(entry => [
      entry.exercise.name.trim().toLowerCase(),
      entry.target,
      entry.sets.map(({ id: _id, position: _position, ...metrics }) => metrics)
    ])
  ])
}

function mode(value: unknown, fallback: ExerciseMode): ExerciseMode {
  if (value === undefined || value === null) return fallback
  if (value === 'reps' || value === 'time' || value === 'cardio') return value
  throw new Error('Unknown exercise logging mode')
}

function legacyJSON(raw: ObjectValue, builder: ImportBuilder): ImportSource {
  const plan = raw.opengym_plan !== undefined

  if (plan && raw.opengym_plan !== 1)
    throw new Error('Unsupported OpenGym plan version')

  const unit = weightUnit(raw.unit, builder.options.unit || 'kg')

  if (!raw.unit)
    builder.warn(
      'assumed_unit',
      `OpenGym file has no source unit; used ${unit}. Check plan loads before importing`
    )

  const customs = new Map<string, ObjectValue>()

  for (const item of list(raw.customEx || [], 'customEx')) {
    const custom = object(item)
    customs.set(string(custom.id), custom)
  }

  const resolve = (id: string, fallback: ObjectValue = {}) => {
    const custom = customs.get(id)
    const existing = builder.options.exercises.find(
      exercise => exercise.catalog_key === id || exercise.id === id
    )
    const details = custom || fallback
    const name = string(
      details.n ?? details.name,
      existing?.name || `Imported exercise ${id}`
    )
    const category = string(details.bp ?? details.category)
    const exerciseMode = mode(
      details.mode,
      existing?.mode || (normalName(category) === 'cardio' ? 'cardio' : 'reps')
    )

    if (!existing && !custom && !details.n && !details.name)
      builder.warn(
        'unresolved_exercise_id',
        `Unknown exercise ${id}; retained with a visible placeholder name`
      )

    return builder.resolve(
      name,
      exerciseMode,
      category,
      custom ? undefined : id,
      string(details.desc)
    )
  }
  const routines = new Map<string, Routine>()

  for (const item of list(raw.routines, 'routines')) {
    const value = object(item)
    const oldId = string(value.id)

    if (!oldId || routines.has(oldId))
      throw new Error('Routine IDs must be unique and nonempty')

    const entries = list(value.ex, 'routine exercises').map(
      (item, position) => {
        const config = object(item)
        const exercise = resolve(string(config.id), config)
        const entryMode = mode(config.mode, exercise.mode)

        return {
          id: builder.id(),
          exercise_id: exercise.id,
          position,
          superset_group: string(config.sg) || null,
          prescription: builder.prescription(config, entryMode, unit)
        }
      }
    )
    const routine = routineSchema.parse({
      id: builder.id(),
      name: string(value.name, 'Imported routine'),
      notes: '',
      progression: value.prog || 'linear',
      entries,
      revision: 1,
      archived: false
    })
    routines.set(oldId, routine)
    builder.data.routines.push(routine)
  }

  for (const [weekday, id] of Object.entries(object(raw.week || {}))) {
    if (!/^[0-6]$/.test(weekday)) throw new Error('Invalid weekday')

    const routine =
      id === null || id === 'rest' ? null : routines.get(string(id))

    if (id !== null && id !== 'rest' && !routine)
      throw new Error('Week references an unknown routine')
    builder.data.schedule.push(
      scheduleSchema.parse({
        id: builder.id(),
        weekday: Number(weekday),
        date: null,
        routine_id: routine?.id || null
      })
    )
  }

  if (!plan) {
    for (const [date, id] of Object.entries(object(raw.dayPlan || {}))) {
      civilDate(date)
      const routine =
        id === 'rest' || id === null ? null : routines.get(string(id))

      if (id !== 'rest' && id !== null && !routine)
        throw new Error('Date override references an unknown routine')
      builder.data.schedule.push(
        scheduleSchema.parse({
          id: builder.id(),
          weekday: null,
          date,
          routine_id: routine?.id || null
        })
      )
    }

    for (const item of list(raw.workouts, 'workouts')) {
      const value = object(item)
      const date = civilDate(string(value.d))
      const start =
        value.start === undefined
          ? builder.date(date).instant
          : new Date(numeric(value.start)).toISOString()
      const finish =
        value.end === undefined
          ? start
          : new Date(numeric(value.end)).toISOString()
      const entries = list(value.entries, 'workout entries').map(item => {
        const entry = object(item)
        const target = object(entry.target || {})
        const rawSets = list(entry.sets, 'sets').map(object)
        const inferred = rawSets.some(set => set.sec !== undefined)
          ? 'time'
          : rawSets.some(
                set => set.min !== undefined || set.speed !== undefined
              )
            ? 'cardio'
            : 'reps'
        const exercise = resolve(string(entry.id), entry)
        const entryMode = mode(target.mode, inferred)
        const sets = rawSets.map((set, position) =>
          setSchema.parse({
            id: builder.id(),
            position,
            weight_kg: kilograms(set.w, unit),
            reps: numeric(set.r),
            seconds: numeric(set.sec),
            minutes: numeric(set.min),
            speed_kmh: numeric(set.speed),
            done: flag(set.done, true),
            rir: set.rir ?? null,
            rpe: set.rpe === 0 ? null : (set.rpe ?? null)
          })
        )
        const prescription = Object.keys(target).length
          ? builder.prescription(target, entryMode, unit, sets.length)
          : undefined

        return builder.entry(
          exercise,
          entryMode,
          sets,
          prescription,
          string(entry.sg ?? target.sg)
        )
      })

      let notes = string(value.notes)
      if (value.rating !== undefined)
        notes += `\nImported session feedback: ${JSON.stringify(value.rating)}`
      builder.data.workouts.push(
        builder.workout(
          string(value.name, 'Imported workout'),
          date,
          start,
          finish,
          entries,
          notes.trim(),
          routines.get(string(value.routineId))?.id || null,
          value.bw ? kilograms(value.bw, unit) : null
        )
      )
    }

    for (const item of list(raw.bodyweight || [], 'bodyweight')) {
      const weight = object(item)
      builder.data.bodyweight.push(
        bodyweightSchema.parse({
          id: builder.id(),
          date: civilDate(string(weight.d)),
          weight_kg: kilograms(weight.w, unit),
          notes: ''
        })
      )
    }

    const reminder = object(raw.reminder || {})
    builder.data.settings = settingsSchema.parse({
      revision: 1,
      unit,
      rest_seconds: numeric(raw.restSec, 90),
      effort: raw.effort ?? (raw.showRir === true ? 'rir' : 'none'),
      sound: flag(raw.sound, true),
      keep_awake: flag(raw.keepAwake, true),
      body_style: raw.body || 'male',
      target_weight_kg: raw.targetW ? kilograms(raw.targetW, unit) : null,
      reminder_enabled: flag(reminder.on, false),
      reminder_time: string(reminder.time, '08:00'),
      timezone: string(reminder.tz, 'UTC')
    })
    if (raw.active)
      builder.warn(
        'active_not_imported',
        'In-progress OpenGym session was not imported; only finished history is merged'
      )
    if (raw.coach)
      builder.warn(
        'coach_not_imported',
        'Legacy Coach consent, pending proposals and snapshots are not imported into native provider authorization'
      )
    if (raw.exWeights)
      builder.warn(
        'working_weight_cache',
        'Legacy working-weight cache is not imported; native targets derive from completed sets and routine prescriptions'
      )
    if (unit === 'lb')
      builder.converted =
        builder.data.bodyweight.length +
        builder.data.workouts.reduce(
          (total, workout) =>
            total +
            workout.entries.reduce(
              (total, entry) => total + entry.sets.length,
              0
            ),
          0
        )
  }
  builder.rows =
    builder.data.routines.length +
    builder.data.workouts.length +
    builder.data.bodyweight.length

  return plan ? 'OpenGym plan' : 'OpenGym backup'
}

const aliases: Record<string, string[]> = {
  exercise: ['exercise', 'exercise name', 'exercise title'],
  date: ['date', 'workout date', 'start time'],
  end: ['end time'],
  title: ['title', 'workout name'],
  category: ['category', 'body part', 'muscle group'],
  kg: ['weight kg'],
  lb: ['weight lbs', 'weight lb'],
  weight: ['weight', 'bodyweight', 'body weight'],
  unit: ['weight unit', 'unit'],
  reps: ['reps', 'repetitions'],
  seconds: ['seconds', 'duration seconds'],
  time: ['time'],
  sessionDuration: ['duration'],
  distance: ['distance'],
  distanceKm: ['distance km'],
  distanceUnit: ['distance unit'],
  speed: ['speed', 'speed kmh', 'speed km h'],
  rpe: ['rpe', 'rpe rating'],
  rir: ['rir', 'reps in reserve'],
  note: ['notes', 'note', 'comment', 'comments', 'exercise notes'],
  workoutNote: ['workout notes', 'description'],
  setType: ['set type', 'kind'],
  superset: ['superset id'],
  mode: ['mode']
}

function csvImport(text: string, builder: ImportBuilder): ImportSource {
  const rows = parseGymCSV(text)
  const header = rows[0]

  if (!header || rows.length < 2)
    throw new Error('CSV must contain a header and data')

  const headers = header.map(normalName)

  if (new Set(headers).size !== headers.length)
    throw new Error('CSV contains duplicate columns')

  const columns = new Map<string, number>()

  for (const [key, names] of Object.entries(aliases)) {
    const index = headers.findIndex(header => names.includes(header))

    if (index !== -1) columns.set(key, index)
  }

  const cell = (row: string[], key: string) => {
    const index = columns.get(key)

    return index === undefined ? '' : (row[index] || '').trim()
  }

  if (!columns.has('date')) throw new Error('CSV has no recognized date column')

  const weightsOnly = !columns.has('exercise')

  if (
    weightsOnly &&
    !columns.has('kg') &&
    !columns.has('lb') &&
    !columns.has('weight')
  )
    throw new Error('CSV has no exercise or body-weight column')

  const source: ImportSource = weightsOnly
    ? 'Bodyweight CSV'
    : headers.includes('exercise title')
      ? 'Hevy'
      : headers.includes('set order')
        ? 'Strong'
        : headers.includes('kind')
          ? 'FitNotes iOS'
          : headers.includes('exercise') && headers.includes('category')
            ? 'FitNotes Android'
            : 'Workout CSV'

  type Session = {
    date: string
    start: string
    end: string
    name: string
    entries: WorkoutEntry[]
    notes: Set<string>
  }

  const sessions = new Map<string, Session>()
  const weights = new Map<
    string,
    { instant: string; weight: GymBackup['bodyweight'][number] }
  >()

  for (const [offset, row] of rows.slice(1).entries()) {
    const rowIndex = offset + 1
    builder.rows++

    try {
      if (row.length !== headers.length)
        throw new Error('Column count differs from the header')

      const date = builder.date(cell(row, 'date'))
      const kg = cell(row, 'kg'),
        lb = cell(row, 'lb')

      if (kg && lb) throw new Error('Row supplies both kg and lb weights')

      const unit = kg
        ? 'kg'
        : lb
          ? 'lb'
          : weightUnit(cell(row, 'unit'), builder.options.unit || 'kg')
      const load = kilograms(kg || lb || cell(row, 'weight'), unit)

      if (weightsOnly) {
        const weight = bodyweightSchema.parse({
          id: builder.id(),
          date: date.date,
          weight_kg: load,
          notes: cell(row, 'note')
        })
        const old = weights.get(date.date)

        if (!old || date.instant >= old.instant)
          weights.set(date.date, { instant: date.instant, weight })
        if (old)
          builder.warn(
            'same_day_bodyweight',
            `Kept the latest body-weight reading on ${date.date}`,
            rowIndex + 1
          )
        if (unit === 'lb') builder.converted++
        continue
      }

      const name = cell(row, 'exercise')

      if (!name) throw new Error('Exercise name is empty')

      const reps = numeric(cell(row, 'reps'))
      const seconds = cell(row, 'seconds')
        ? numeric(cell(row, 'seconds'))
        : duration(cell(row, 'time'))
      const distances: Record<string, number> = {
        km: 1,
        kilometer: 1,
        kilometers: 1,
        m: 0.001,
        meter: 0.001,
        meters: 0.001,
        mi: 1.609344,
        mile: 1.609344,
        miles: 1.609344,
        ft: 0.0003048,
        feet: 0.0003048,
        yd: 0.0009144,
        yards: 0.0009144
      }
      const distanceUnit = normalName(cell(row, 'distanceUnit') || 'km')

      if (cell(row, 'distance') && distances[distanceUnit] === undefined)
        throw new Error('Unknown distance unit')

      const distance = cell(row, 'distanceKm')
        ? numeric(cell(row, 'distanceKm'))
        : numeric(cell(row, 'distance')) * (distances[distanceUnit] || 1)
      const known = builder.options.exercises.filter(
        exercise => exerciseName(exercise.name) === exerciseName(name)
      )
      const fallbackMode: ExerciseMode =
        reps > 0
          ? 'reps'
          : distance > 0 ||
              (known.length === 1 && known[0]?.mode === 'cardio') ||
              normalName(cell(row, 'category')) === 'cardio'
            ? 'cardio'
            : seconds > 0
              ? 'time'
              : 'reps'
      const entryMode = mode(cell(row, 'mode') || undefined, fallbackMode)

      if (!reps && !seconds && !distance && !load && !cell(row, 'speed'))
        throw new Error('Set has no measurements')

      const rawRir = cell(row, 'rir'),
        rawRpe = cell(row, 'rpe')
      const rir = rawRir ? numeric(rawRir) : null
      const rpeNumber = rawRpe ? numeric(rawRpe) : null
      const rpe = rpeNumber === 0 ? null : rpeNumber
      const set = setSchema.parse({
        id: builder.id(),
        position: 0,
        weight_kg: load,
        reps,
        seconds: entryMode === 'time' ? seconds : 0,
        minutes: entryMode === 'cardio' ? seconds / 60 : 0,
        speed_kmh: cell(row, 'speed')
          ? numeric(cell(row, 'speed'))
          : entryMode === 'cardio' && seconds > 0
            ? rounded((distance * 3600) / seconds)
            : 0,
        done: true,
        rir,
        rpe
      })

      if (entryMode !== 'reps' && (rir !== null || rpe !== null))
        builder.warn(
          'effort_on_non_rep',
          'Source effort retained on a non-repetition set',
          rowIndex + 1
        )

      const title = cell(row, 'title') || 'Imported workout'
      const key = JSON.stringify([
        date.date,
        date.timed ? date.instant : '',
        title
      ])
      const previous = sessions.get(key)
      const session: Session = previous
        ? {
            ...previous,
            entries: previous.entries.map(entry => ({
              ...entry,
              sets: [...entry.sets]
            })),
            notes: new Set(previous.notes)
          }
        : {
            date: date.date,
            start: date.instant,
            end: date.instant,
            name: title,
            entries: [],
            notes: new Set<string>()
          }
      const end = cell(row, 'end')
        ? builder.date(cell(row, 'end')).instant
        : cell(row, 'sessionDuration')
          ? new Date(
              new Date(date.instant).getTime() +
                duration(cell(row, 'sessionDuration')) * 1000
            ).toISOString()
          : date.instant

      if (new Date(end).getTime() < new Date(date.instant).getTime())
        throw new Error('Workout end precedes start')
      if (end > session.end) session.end = end

      const exercise = builder.resolve(name, entryMode, cell(row, 'category'))
      const group = cell(row, 'superset') || null

      let entry = session.entries.find(
        entry =>
          entry.exercise_id === exercise.id &&
          entry.target.mode === entryMode &&
          entry.superset_group === group
      )

      if (!entry) {
        entry = builder.entry(
          exercise,
          entryMode,
          [{ ...set, position: 0 }],
          undefined,
          group || undefined
        )
        session.entries.push(entry)
      } else {
        const nextSets = [
          ...entry.sets,
          { ...set, position: entry.sets.length }
        ]
        const nextTarget = prescriptionSchema.parse({
          ...entry.target,
          sets: nextSets.length,
          reps: Math.max(1, ...nextSets.map(set => set.reps)),
          seconds: Math.max(...nextSets.map(set => set.seconds)),
          minutes: Math.max(...nextSets.map(set => set.minutes)),
          weight_kg: Math.max(...nextSets.map(set => set.weight_kg)),
          speed_kmh: Math.max(...nextSets.map(set => set.speed_kmh))
        })
        entry.sets = nextSets
        entry.target = nextTarget
      }
      for (const note of [
        cell(row, 'workoutNote'),
        cell(row, 'note') ? `${name}: ${cell(row, 'note')}` : '',
        cell(row, 'setType')
          ? `${name}: imported set type ${cell(row, 'setType')}`
          : '',
        distance > 0 ? `${name}: imported distance ${distance} km` : ''
      ])
        if (note) session.notes.add(note)
      if (/warm/i.test(cell(row, 'setType'))) builder.warmups++
      if (unit === 'lb') builder.converted++
      sessions.set(key, session)
    } catch (error) {
      builder.skipped++
      builder.warn(
        'invalid_row',
        error instanceof Error ? error.message : 'Invalid row',
        rowIndex + 1
      )
    }
  }
  builder.data.bodyweight.push(
    ...[...weights.values()].map(value => value.weight)
  )
  for (const session of sessions.values())
    builder.data.workouts.push(
      builder.workout(
        session.name,
        session.date,
        session.start,
        session.end,
        session.entries,
        [...session.notes].join('\n')
      )
    )
  if (!builder.data.workouts.length && !builder.data.bodyweight.length)
    throw new Error('No valid records found in CSV')
  if (!columns.has('kg') && !columns.has('lb') && !columns.has('unit'))
    builder.warn(
      'assumed_unit',
      `Missing source unit; used ${builder.options.unit || 'kg'}`
    )
  if (source === 'FitNotes Android' || source === 'FitNotes iOS')
    builder.warn(
      'date_only_sessions',
      'Rows without session times are grouped by date and workout title; the file cannot distinguish identical untimed same-day sessions'
    )

  return source
}

function appleHealth(text: string, builder: ImportBuilder): ImportSource {
  if (/<!ENTITY/i.test(text))
    throw new Error('XML entity declarations are not supported')

  const inertText = text.replace(
    /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g,
    ''
  )
  const records = /<Record\b([^<>]*?)(?:\/?>)/g
  const weights = new Map<
    string,
    { instant: string; weight: GymBackup['bodyweight'][number] }
  >()

  let record: RegExpExecArray | null

  while ((record = records.exec(inertText))) {
    const attributes: Record<string, string> = {}
    const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

    let attribute: RegExpExecArray | null

    while ((attribute = pattern.exec(capture(record, 1)))) {
      const key = capture(attribute, 1)
      const value = attribute[2] ?? attribute[3]

      if (value === undefined) throw new Error('Missing XML attribute value')
      if (attributes[key] !== undefined)
        throw new Error('Duplicate XML attribute')
      attributes[key] = value
    }
    if (attributes.type !== 'HKQuantityTypeIdentifierBodyMass') continue
    builder.rows++
    if (builder.rows > MAX_ROWS)
      throw new Error('Import has too many body-weight records')

    try {
      const date = builder.date(
        attributes.startDate || attributes.creationDate || ''
      )
      const unit = weightUnit(attributes.unit, builder.options.unit || 'kg')
      const weight = bodyweightSchema.parse({
        id: builder.id(),
        date: date.date,
        weight_kg: kilograms(attributes.value, unit),
        notes: attributes.sourceName
          ? `Imported from Apple Health (${attributes.sourceName})`
          : 'Imported from Apple Health'
      })

      if (unit === 'lb') builder.converted++

      const old = weights.get(date.date)

      if (!old || date.instant >= old.instant)
        weights.set(date.date, { instant: date.instant, weight })
      if (old)
        builder.warn(
          'same_day_bodyweight',
          `Kept the latest body-weight reading on ${date.date}`
        )
    } catch (error) {
      builder.skipped++
      builder.warn(
        'invalid_record',
        error instanceof Error ? error.message : 'Invalid body-weight record',
        builder.rows
      )
    }
  }
  builder.data.bodyweight.push(
    ...[...weights.values()]
      .map(value => value.weight)
      .sort((a, b) => a.date.localeCompare(b.date))
  )
  if (!builder.data.bodyweight.length)
    throw new Error('No valid Apple Health body-mass records found')

  return 'Apple Health'
}

/** Returns a reviewable native merge payload; this function never persists or overwrites. */
export function parseGymImport(
  text: string,
  options: GymImportOptions
): GymImportPreview {
  if (text.length > MAX_CHARS)
    throw new Error('Import exceeds the 25 MiB text limit')

  const input = text.replace(/^\uFEFF/, '').trim()

  if (!input) throw new Error('Import file is empty')

  const builder = new ImportBuilder(options)

  let source: ImportSource
  if (input.startsWith('{') || input.startsWith('[')) {
    const raw = object(JSON.parse(input))
    forbidSensitive(raw)
    if (raw.format === 'zillion-gym') {
      const backup = backupSchema.parse(raw)

      if (
        new Set(backup.exercises.map(exercise => exercise.id)).size !==
        backup.exercises.length
      )
        throw new Error('Duplicate exercise IDs')
      Object.assign(builder.data, backup)
      if (backup.workouts.some(workout => workout.status === 'active'))
        builder.warn(
          'native_active_session',
          'Native active session and timer are preserved. Merge requires no conflicting active session; restore replaces the current session'
        )
      for (const exercise of backup.exercises)
        builder.used.set(exercise.id, exercise)
      builder.rows =
        backup.routines.length +
        backup.workouts.length +
        backup.bodyweight.length
      source = 'ZillionOS JSON'
    } else source = legacyJSON(raw, builder)
  } else if (input.startsWith('<')) source = appleHealth(input, builder)
  else source = csvImport(input, builder)

  return builder.finish(source)
}
