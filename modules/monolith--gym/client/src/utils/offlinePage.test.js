import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

import {
  changeCachedSet,
  readCachedGym,
  readCachedRecovery,
  writeCachedDraft
} from '../../../../../apps/web/public/zillion-gym-offline.js'

const owner = '00000000-0000-4000-8000-000000000001'
const workout = {
  id: 'workout',
  status: 'active',
  revision: 7,
  entries: [
    {
      id: 'entry',
      sets: [
        { id: 'set', reps: 8, weight_kg: 40, done: false, rir: null, rpe: null }
      ]
    }
  ],
  work_timer: { set_id: 'set' }
}
const cached = {
  version: 1,
  owner_id: owner,
  data: {
    active: workout,
    exercises: [],
    routines: [],
    workouts: [],
    settings: { unit: 'kg' }
  }
}

function storage(values) {
  return { getItem: key => values[key] ?? null }
}

function startStandalonePage(localStorage) {
  function element(tagName) {
    const listeners = new Map()
    const attributes = new Map()

    return {
      tagName,
      children: [],
      textContent: '',
      value: '',
      checked: false,
      append(...children) {
        this.children.push(...children)
      },
      replaceChildren(...children) {
        this.children = children
      },
      setAttribute(name, value) {
        attributes.set(name, value)
      },
      removeAttribute(name) {
        attributes.delete(name)
      },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, [])
        listeners.get(type).push(listener)
      },
      dispatchEvent(event) {
        for (const listener of listeners.get(event.type) ?? []) listener(event)
      }
    }
  }

  const roots = Object.fromEntries(
    ['status', 'help', 'content', 'navigation', 'reconnect', 'clear'].map(
      id => [`#${id}`, element('div')]
    )
  )
  const source = readFileSync(
    new URL(
      '../../../../../apps/web/public/zillion-gym-offline.js',
      import.meta.url
    ),
    'utf8'
  )

  // Execute the real module's startup and event handlers with no browser dependencies.
  runInNewContext(source.replace(/^export (?=function )/gm, ''), {
    localStorage,
    document: {
      documentElement: { lang: 'en' },
      createElement: element,
      querySelector: selector => roots[selector]
    },
    window: { addEventListener: () => undefined },
    navigator: {},
    structuredClone
  })

  return roots
}

function findElement(root, predicate) {
  if (predicate(root)) return root

  for (const child of root.children) {
    const found = findElement(child, predicate)

    if (found) return found
  }
}

describe('independent offline Gym draft page', () => {
  it('persists numeric input before blur and restores completion and notes on a fresh page', () => {
    const active = {
      ...workout,
      name: 'Offline no-blur regression',
      date: '2026-10-12',
      notes: 'Original workout note',
      work_timer: null,
      entries: [
        {
          ...workout.entries[0],
          exercise: { name: 'Bench press' },
          target: { mode: 'reps' },
          sets: [{ ...workout.entries[0].sets[0], weight_kg: 70 }]
        }
      ]
    }
    const snapshot = {
      ...cached,
      owner_name: 'Offline fixture',
      saved_at: '2026-10-12T12:00:00Z',
      labels: {
        workout: 'Workout',
        weight: 'Weight',
        notes: 'Notes',
        done: 'Completed'
      },
      data: {
        ...cached.data,
        schedule: [],
        active,
        settings: { unit: 'kg', effort: 'none' }
      }
    }
    const nativeKey = `zillion-gym:active:v1:${owner}`
    const offlineKey = `zillion-gym:offline:draft:v1:${owner}`
    const native = JSON.stringify({
      owner_id: owner,
      server: active,
      draft: active,
      pending: {
        command_id: 'exact-replay-command',
        expected_revision: 7,
        body: { notes: 'Uncertain native command' }
      }
    })
    const values = {
      'zillion-gym:offline:owner:v1': owner,
      'zillion-gym:offline:snapshot:v1': JSON.stringify(snapshot),
      [nativeKey]: native
    }
    const local = {
      ...storage(values),
      setItem: (key, value) => {
        values[key] = value
      }
    }
    const page = startStandalonePage(local)
    const openWorkout = roots => {
      const button = findElement(
        roots['#navigation'],
        node => node.tagName === 'button' && node.textContent === 'Workout'
      )
      expect(button).toBeDefined()
      button.dispatchEvent({ type: 'click' })
    }
    openWorkout(page)

    const notes = findElement(
      page['#content'],
      node => node.tagName === 'textarea'
    )
    notes.value = 'Keep this note through both edits and reload'
    notes.dispatchEvent({ type: 'input' })
    const weightLabel = findElement(
      page['#content'],
      node => node.tagName === 'label' && node.textContent === 'Weight (kg)'
    )
    const weight = weightLabel.children[0]
    weight.value = '45'
    // Typing dispatches input only: no change, blur or focus transition.
    weight.dispatchEvent({ type: 'input' })
    expect(
      JSON.parse(values[offlineKey]).draft.entries[0].sets[0].weight_kg
    ).toBe(45)

    const done = findElement(
      page['#content'],
      node => node.tagName === 'input' && node.type === 'checkbox'
    )
    done.checked = true
    done.dispatchEvent({ type: 'change' })

    // A fresh VM/document simulates closing the cached page and a cold reload.
    const reloaded = startStandalonePage(local)
    openWorkout(reloaded)
    const restoredWeight = findElement(
      reloaded['#content'],
      node => node.tagName === 'label' && node.textContent === 'Weight (kg)'
    ).children[0]
    const restoredDone = findElement(
      reloaded['#content'],
      node => node.tagName === 'input' && node.type === 'checkbox'
    )
    const restoredNotes = findElement(
      reloaded['#content'],
      node => node.tagName === 'textarea'
    )

    expect(restoredWeight.value).toBe('45')
    expect(restoredDone.checked).toBe(true)
    expect(restoredNotes.value).toBe(
      'Keep this note through both edits and reload'
    )
    expect(values[nativeKey]).toBe(native)
    expect(JSON.parse(values[offlineKey]).pending).toEqual(
      JSON.parse(native).pending
    )
    expect(
      JSON.parse(values['zillion-gym:offline:snapshot:v1']).data.active
        .entries[0].sets[0].weight_kg
    ).toBe(70)
  })

  it('uses a separate outbox and cannot overwrite a newer native uncertain command', () => {
    const values = {
      'zillion-gym:offline:owner:v1': owner,
      'zillion-gym:offline:snapshot:v1': JSON.stringify(cached),
      [`zillion-gym:active:v1:${owner}`]: 'native-baseline'
    }
    const local = {
      ...storage(values),
      setItem: (key, value) => {
        values[key] = value
      }
    }
    const draft = changeCachedSet(workout, 'entry', 'set', 'weight_kg', 65)
    const result = writeCachedDraft(
      local,
      cached,
      'native-baseline',
      null,
      null,
      draft
    )
    expect(result.state).toBe('saved')
    expect(values[`zillion-gym:active:v1:${owner}`]).toBe('native-baseline')
    values[`zillion-gym:active:v1:${owner}`] = 'new-uncertain-command'
    expect(
      writeCachedDraft(
        local,
        cached,
        'native-baseline',
        result.serialized,
        null,
        workout
      ).state
    ).toBe('conflict')
    expect(values[`zillion-gym:active:v1:${owner}`]).toBe(
      'new-uncertain-command'
    )
    expect(values[`zillion-gym:offline:draft:v1:${owner}`]).toBe(
      result.serialized
    )
  })
  it('rejects draft writes after removal, owner switching or a finished active session', () => {
    const values = {
      'zillion-gym:offline:owner:v1': owner,
      'zillion-gym:offline:snapshot:v1': JSON.stringify(cached)
    }
    const local = {
      ...storage(values),
      setItem: (key, value) => {
        values[key] = value
      }
    }
    values['zillion-gym:offline:owner:v1'] = 'other'
    expect(
      writeCachedDraft(local, cached, null, null, null, workout).state
    ).toBe('owner')
    values['zillion-gym:offline:owner:v1'] = owner
    values['zillion-gym:offline:snapshot:v1'] = JSON.stringify({
      ...cached,
      data: { ...cached.data, active: null }
    })
    expect(
      writeCachedDraft(local, cached, null, null, null, workout).state
    ).toBe('inactive')
  })
  it('requires the selected cache owner and never accepts another profile', () => {
    expect(
      readCachedGym(
        storage({
          'zillion-gym:offline:owner:v1': owner,
          'zillion-gym:offline:snapshot:v1': JSON.stringify(cached)
        })
      )
    ).toEqual(cached)
    expect(
      readCachedGym(
        storage({
          'zillion-gym:offline:owner:v1': 'another',
          'zillion-gym:offline:snapshot:v1': JSON.stringify(cached)
        })
      )
    ).toBeNull()
  })
  it('preserves an exact uncertain command for online replay', () => {
    const pending = {
      command_id: 'command',
      expected_revision: 7,
      body: { notes: 'uncertain response' }
    }
    const recovery = {
      owner_id: owner,
      server: workout,
      draft: workout,
      pending
    }
    const result = readCachedRecovery(
      storage({ [`zillion-gym:active:v1:${owner}`]: JSON.stringify(recovery) }),
      cached
    )
    expect(result.pending).toEqual(pending)
    expect(
      readCachedRecovery(
        storage({
          [`zillion-gym:active:v1:${owner}`]: JSON.stringify({
            ...recovery,
            owner_id: 'another'
          })
        }),
        cached
      )
    ).toBeNull()
  })
  it('edits canonical load without mutating the server snapshot or revision', () => {
    const draft = changeCachedSet(workout, 'entry', 'set', 'weight_kg', 65)
    expect(draft.entries[0].sets[0].weight_kg).toBe(65)
    expect(workout.entries[0].sets[0].weight_kg).toBe(40)
    expect(draft.revision).toBe(7)
  })
  it('retains zero effort and clears a completed work timer', () => {
    expect(
      changeCachedSet(workout, 'entry', 'set', 'rir', 0).entries[0].sets[0].rir
    ).toBe(0)
    const done = changeCachedSet(workout, 'entry', 'set', 'done', true)
    expect(done.work_timer).toBeNull()
    expect(done.status).toBe('active')
  })
  it('rejects invalid numeric fields, unsafe ranges and unknown set IDs', () => {
    for (const [field, value] of [
      ['weight_kg', -1],
      ['reps', 1.5],
      ['minutes', Infinity],
      ['speed_kmh', 201],
      ['rir', 11],
      ['status', 1]
    ])
      expect(changeCachedSet(workout, 'entry', 'set', field, value)).toBeNull()
    expect(changeCachedSet(workout, 'entry', 'absent', 'reps', 10)).toBeNull()
  })
})
