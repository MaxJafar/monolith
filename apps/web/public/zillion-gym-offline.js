const ownerKey = 'zillion-gym:offline:owner:v1'
const snapshotKey = 'zillion-gym:offline:snapshot:v1'
const poundsPerKg = 2.2046226218487757

export function readCachedGym(storage) {
  try {
    const owner = storage.getItem(ownerKey)
    const raw = storage.getItem(snapshotKey)

    if (!owner || !raw || raw.length > 12000000) return null

    const value = JSON.parse(raw)

    if (
      value.version !== 1 ||
      value.owner_id !== owner ||
      !value.data ||
      !Array.isArray(value.data.routines) ||
      !Array.isArray(value.data.exercises) ||
      !Array.isArray(value.data.workouts) ||
      !value.data.settings
    )
      return null

    return value
  } catch {
    return null
  }
}

export function readCachedRecovery(storage, snapshot) {
  try {
    const raw = storage.getItem(`zillion-gym:active:v1:${snapshot.owner_id}`)

    if (!raw || raw.length > 2000000) return null

    const value = JSON.parse(raw)

    return value.owner_id === snapshot.owner_id &&
      value.server?.id === snapshot.data.active?.id &&
      value.draft?.id === value.server.id &&
      value.server.status === 'active' &&
      value.draft.status === 'active'
      ? value
      : null
  } catch {
    return null
  }
}

export function changeCachedSet(workout, entryId, setId, field, number) {
  const bounds = {
    weight_kg: 10000,
    reps: 1000,
    seconds: 86400,
    minutes: 1440,
    speed_kmh: 200,
    rir: 10,
    rpe: 10
  }

  if (!Object.prototype.hasOwnProperty.call(bounds, field) && field !== 'done')
    return null
  if (
    field !== 'done' &&
    !(number === null && ['rir', 'rpe'].includes(field)) &&
    (!Number.isFinite(number) ||
      number < 0 ||
      number > bounds[field] ||
      (field === 'reps' && !Number.isInteger(number)))
  )
    return null

  const value = structuredClone(workout)
  const set = value.entries
    .find(entry => entry.id === entryId)
    ?.sets.find(set => set.id === setId)

  if (!set) return null
  set[field] = field === 'done' ? !!number : number
  if (number !== null && field === 'rir') set.rpe = null
  if (number !== null && field === 'rpe') set.rir = null
  if (set.done && value.work_timer?.set_id === set.id) value.work_timer = null

  return value
}

export function writeCachedDraft(
  storage,
  snapshot,
  nativeBaseline,
  offlineBaseline,
  recovery,
  next
) {
  try {
    const current = readCachedGym(storage)

    if (current?.owner_id !== snapshot.owner_id) return { state: 'owner' }
    if (current.data.active?.id !== next.id) return { state: 'inactive' }

    const nativeKey = `zillion-gym:active:v1:${snapshot.owner_id}`
    const offlineKey = `zillion-gym:offline:draft:v1:${snapshot.owner_id}`

    if (
      storage.getItem(nativeKey) !== nativeBaseline ||
      storage.getItem(offlineKey) !== offlineBaseline
    )
      return { state: 'conflict' }

    const value = {
      owner_id: snapshot.owner_id,
      server: recovery?.server ?? snapshot.data.active,
      draft: next,
      pending: recovery?.pending ?? null,
      native_baseline: nativeBaseline,
      saved_at: new Date().toISOString()
    }
    const serialized = JSON.stringify(value)

    if (serialized.length > 6000000) return { state: 'storage' }
    storage.setItem(offlineKey, serialized)

    return { state: 'saved', recovery: value, serialized }
  } catch {
    return { state: 'storage' }
  }
}

function startOfflineGym() {
  const snapshot = readCachedGym(localStorage)
  const status = document.querySelector('#status')
  const help = document.querySelector('#help')
  const content = document.querySelector('#content')
  const navigation = document.querySelector('#navigation')
  const label = key => snapshot?.labels?.[key] || key

  let recovery = snapshot ? readCachedRecovery(localStorage, snapshot) : null

  const nativeKey = snapshot ? `zillion-gym:active:v1:${snapshot.owner_id}` : ''
  const offlineKey = snapshot
    ? `zillion-gym:offline:draft:v1:${snapshot.owner_id}`
    : ''
  const nativeBaseline = localStorage.getItem(nativeKey)

  let offlineBaseline = localStorage.getItem(offlineKey)

  if (offlineBaseline) {
    try {
      const retained = JSON.parse(offlineBaseline)

      if (
        retained.owner_id === snapshot.owner_id &&
        retained.native_baseline === nativeBaseline &&
        retained.server?.id === snapshot.data.active?.id &&
        retained.draft?.id === retained.server.id
      )
        recovery = retained
    } catch {
      /* Leave an unreadable retained draft untouched. */
    }
  }
  let workout =
    nativeBaseline && !readCachedRecovery(localStorage, snapshot)
      ? null
      : (recovery?.draft ?? snapshot?.data.active ?? null)
  let section = 'plan'
  let locked = false

  function stillOwned() {
    const current = readCachedGym(localStorage)

    return !!snapshot && current?.owner_id === snapshot.owner_id
  }

  function lockPage() {
    locked = true
    workout = null
    recovery = null
    content.replaceChildren()
    navigation.replaceChildren()
    status.textContent = label('missing')
    help.textContent = ''
    document.title = 'monolith Gym'
  }
  window.addEventListener('storage', event => {
    if ([null, ownerKey, snapshotKey].includes(event.key) && !stillOwned())
      lockPage()
  })
  window.addEventListener('zillion-gym-sign-out', lockPage)

  const node = (tag, text, className) => {
    const element = document.createElement(tag)

    if (text !== undefined) element.textContent = String(text)
    if (className) element.className = className

    return element
  }
  const button = (text, callback) => {
    const element = node('button', text)
    element.type = 'button'
    element.addEventListener('click', callback)

    return element
  }
  const displayWeight = kg =>
    Math.round(
      kg * (snapshot.data.settings.unit === 'lb' ? poundsPerKg : 1) * 100
    ) / 100
  const formatSet = (entry, set) =>
    entry.target.mode === 'time'
      ? `${set.seconds} s · ${displayWeight(set.weight_kg)} ${snapshot.data.settings.unit}`
      : entry.target.mode === 'cardio'
        ? `${set.minutes} min · ${set.speed_kmh} km/h`
        : `${set.reps} × ${displayWeight(set.weight_kg)} ${snapshot.data.settings.unit}`

  const reconnect = document.querySelector('#reconnect')
  reconnect.textContent = label('reconnect')
  reconnect.addEventListener('click', () =>
    location.assign('/gym?section=workout')
  )
  const clear = document.querySelector('#clear')
  clear.textContent = label('clear')
  clear.addEventListener('click', () => {
    if (!confirm(label('clearConfirm'))) return
    localStorage.removeItem(ownerKey)
    localStorage.removeItem(snapshotKey)
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .getRegistration('/gym')
        .then(registration =>
          registration?.active?.postMessage({ type: 'GYM_OFFLINE_DISABLE' })
        )
        .catch(() => {})
    location.reload()
  })

  if (!snapshot) {
    status.textContent =
      'No opted-in Gym cache is available. Connect and enable device caching in Gym settings.'
    help.textContent = ''

    return
  }
  document.title = `monolith Gym · ${label('title')}`
  status.textContent = `${label('title')} · ${snapshot.owner_name} · ${label('saved')}: ${new Date(snapshot.saved_at).toLocaleString()}`
  help.textContent = label('help')

  function saveDraft(next) {
    if (locked || !stillOwned()) {
      lockPage()

      return false
    }

    const result = writeCachedDraft(
      localStorage,
      snapshot,
      nativeBaseline,
      offlineBaseline,
      recovery,
      next
    )

    if (result.state === 'saved') {
      offlineBaseline = result.serialized
      recovery = result.recovery
      workout = next
      status.textContent = label('savedDraft')

      return true
    }
    if (result.state === 'owner') lockPage()
    else
      status.textContent = label(
        result.state === 'conflict'
          ? 'draftConflict'
          : result.state === 'inactive'
            ? 'noActive'
            : 'storageError'
      )

    return false
  }

  function showHistory(workout) {
    if (locked || !stillOwned()) return lockPage()
    content.replaceChildren()
    content.append(button(label('history'), () => render()))
    const card = node('article', undefined, 'card')
    card.append(node('h2', `${workout.date} · ${workout.name}`))
    card.append(node('p', workout.notes))

    for (const entry of workout.entries) {
      card.append(node('h3', entry.exercise.name))
      for (const set of entry.sets.filter(set => set.done))
        card.append(node('p', formatSet(entry, set)))
    }
    content.append(card)
  }

  function render() {
    if (locked || !stillOwned()) return lockPage()
    navigation.replaceChildren()

    for (const key of ['plan', 'library', 'history', 'workout']) {
      const item = button(label(key), () => {
        section = key
        render()
      })

      if (section === key) item.setAttribute('aria-current', 'page')
      navigation.append(item)
    }
    content.replaceChildren()

    if (section === 'plan') {
      const week = node('div', undefined, 'card')

      for (const day of [1, 2, 3, 4, 5, 6, 0]) {
        const scheduled = snapshot.data.schedule.find(
          item => item.weekday === day
        )
        const routine = snapshot.data.routines.find(
          item => item.id === scheduled?.routine_id && !item.archived
        )
        const date = new Date(Date.UTC(2026, 9, 11 + day))
        week.append(
          node(
            'p',
            `${new Intl.DateTimeFormat(document.documentElement.lang, { weekday: 'long', timeZone: 'UTC' }).format(date)} · ${routine?.name ?? label('rest')}`
          )
        )
      }

      for (const override of snapshot.data.schedule.filter(item => item.date)) {
        const routine = snapshot.data.routines.find(
          item => item.id === override.routine_id && !item.archived
        )
        week.append(
          node('p', `${override.date} · ${routine?.name ?? label('rest')}`)
        )
      }
      content.append(week)
      const grid = node('div', undefined, 'grid')

      for (const routine of snapshot.data.routines.filter(
        item => !item.archived
      )) {
        const card = node('article', undefined, 'card')
        card.append(node('h2', routine.name), node('p', routine.notes))

        for (const entry of routine.entries) {
          const exercise = snapshot.data.exercises.find(
            item => item.id === entry.exercise_id
          )
          const p = entry.prescription
          card.append(
            node(
              'p',
              `${exercise?.name ?? ''} · ${p.sets} × ${p.mode === 'time' ? `${p.seconds} s` : p.mode === 'cardio' ? `${p.minutes} min · ${p.speed_kmh} km/h` : `${p.reps} · ${displayWeight(p.weight_kg)} ${snapshot.data.settings.unit}`}${entry.superset_group ? ` · ${entry.superset_group}` : ''}`
            )
          )
        }
        grid.append(card)
      }
      content.append(grid)
    } else if (section === 'library') {
      const search = node('input')
      search.type = 'search'
      search.placeholder = label('search')
      search.setAttribute('aria-label', label('search'))
      const results = node('div', undefined, 'grid')
      const update = () => {
        results.replaceChildren()
        const query = search.value.toLowerCase()
        const exercises = snapshot.data.exercises.filter(
          item =>
            !item.archived &&
            `${item.name} ${item.muscle_group} ${item.equipment}`
              .toLowerCase()
              .includes(query)
        )

        for (const exercise of exercises.slice(0, 40)) {
          const card = node('article', undefined, 'card')
          card.append(
            node('h2', exercise.name),
            node(
              'p',
              `${exercise.muscle_group} · ${exercise.equipment}`,
              'muted'
            )
          )
          const details = node('details')
          details.append(
            node('summary', label('instructions')),
            node('p', exercise.instructions)
          )
          card.append(details)
          results.append(card)
        }
      }
      search.addEventListener('input', update)
      content.append(search, results)
      update()
    } else if (section === 'history') {
      for (const item of snapshot.data.workouts
        .filter(item => item.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date))) {
        const card = node('article', undefined, 'card')
        card.append(
          button(`${item.date} · ${item.name}`, () => showHistory(item))
        )
        const sets = item.entries
          .flatMap(entry => entry.sets)
          .filter(set => set.done).length
        card.append(node('p', `${label('completed')}: ${sets}`))
        content.append(card)
      }
    } else if (!workout) content.append(node('p', label('noActive')))
    else {
      content.append(node('h2', `${workout.date} · ${workout.name}`))
      const notesLabel = node('label', label('notes'))
      const notes = node('textarea')
      notes.value = workout.notes
      notes.maxLength = 10000
      notes.addEventListener('input', () =>
        saveDraft({ ...workout, notes: notes.value })
      )
      notesLabel.append(notes)
      content.append(notesLabel)

      for (const entry of workout.entries) {
        const card = node('article', undefined, 'card')
        card.append(node('h3', entry.exercise.name))

        for (const set of entry.sets) {
          const fields = node('div', undefined, 'fields')
          const mode = entry.target.mode
          const keys =
            mode === 'cardio'
              ? ['minutes', 'speed_kmh']
              : mode === 'time'
                ? ['seconds', 'weight_kg']
                : ['reps', 'weight_kg']

          if (snapshot.data.settings.effort !== 'none' && mode === 'reps')
            keys.push(snapshot.data.settings.effort)

          for (const field of keys) {
            const key =
              field === 'weight_kg'
                ? 'weight'
                : field === 'speed_kmh'
                  ? 'speed'
                  : field
            const wrapper = node(
              'label',
              `${label(key)}${field === 'weight_kg' ? ` (${snapshot.data.settings.unit})` : field === 'speed_kmh' ? ' (km/h)' : ''}`
            )
            const input = node('input')
            input.type = 'number'
            input.min = '0'
            input.step = field === 'reps' ? '1' : 'any'
            input.value =
              field === 'weight_kg'
                ? String(displayWeight(set[field]))
                : (set[field] ?? '')
            input.addEventListener('input', () => {
              const nullable = ['rir', 'rpe'].includes(field)
              const number =
                !input.value && nullable
                  ? null
                  : field === 'weight_kg' &&
                      snapshot.data.settings.unit === 'lb'
                    ? Number(input.value) / poundsPerKg
                    : Number(input.value)
              const next = changeCachedSet(
                workout,
                entry.id,
                set.id,
                field,
                number
              )

              if ((!input.value && !nullable) || !next || !saveDraft(next))
                input.setAttribute('aria-invalid', 'true')
              else input.removeAttribute('aria-invalid')
            })
            wrapper.append(input)
            fields.append(wrapper)
          }

          const done = node('label', label('done'))
          const checkbox = node('input')
          checkbox.type = 'checkbox'
          checkbox.checked = set.done
          checkbox.addEventListener('change', () => {
            const next = changeCachedSet(
              workout,
              entry.id,
              set.id,
              'done',
              checkbox.checked
            )

            if (next) saveDraft(next)
          })
          done.append(checkbox)
          fields.append(done)
          card.append(fields)
        }
        content.append(card)
      }
    }
  }
  render()
}

if (typeof document !== 'undefined') startOfflineGym()
