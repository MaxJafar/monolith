import z from 'zod'

export const stats = {
  CRFT: {
    color: '#d98632',
    icon: 'lucide:hammer',
    skills: ['Writing', 'Coding', 'Design', 'Music production']
  },
  BODY: {
    color: '#df6464',
    icon: 'lucide:heart',
    skills: ['Training', 'Personal health', 'Meal planning']
  },
  EXP: {
    color: '#568fdf',
    icon: 'lucide:briefcase',
    skills: ['Entrepreneurship', 'Marketing', 'Finance', 'Career growth']
  },
  INT: {
    color: '#54a776',
    icon: 'lucide:book-open',
    skills: ['Reading', 'Research', 'Languages']
  },
  JOY: {
    color: '#a27bdc',
    icon: 'lucide:sparkles',
    skills: ['Hobbies', 'Exploration', 'Play']
  },
  MIND: {
    color: '#c7a543',
    icon: 'lucide:sun',
    skills: ['Meditation', 'Journaling', 'Emotional intelligence']
  },
  DISC: {
    color: '#87929c',
    icon: 'lucide:shield-check',
    skills: ['Organization', 'Cooking', 'Time management']
  },
  CHAR: {
    color: '#d16da5',
    icon: 'lucide:users',
    skills: ['Communication', 'Relationships', 'Pet care']
  }
} as const
export const statCode = z.enum([
  'CRFT',
  'BODY',
  'EXP',
  'INT',
  'JOY',
  'MIND',
  'DISC',
  'CHAR'
])
export type StatCode = z.infer<typeof statCode>
export const itemKinds = [
  'epic',
  'mission',
  'quest',
  'challenge',
  'action',
  'daily',
  'weekly',
  'workout'
] as const
export const baseXP = {
  epic: 5000,
  mission: 2000,
  quest: 1000,
  challenge: 350,
  action: 100,
  daily: 30,
  weekly: 100,
  workout: 100
}
export const difficulty = {
  trivial: 0.5,
  easy: 1,
  medium: 1.5,
  hard: 2,
  expert: 3,
  mythic: 5
}
export const quality = { minimum: 0.7, done: 1, strong: 1.25, excellent: 1.5 }
const uuid = z.string().uuid()
const title = z.string().trim().min(1).max(200)
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === value
  })
export const characterSchema = z
  .object({
    name: title,
    age: z.number().int().min(1).max(120).nullable(),
    weight: z.number().positive().max(500).nullable(),
    avatar: z
      .string()
      .max(400000)
      .refine(
        value =>
          !value ||
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
      ),
    calorieTarget: z.number().int().positive().max(20000),
    waterTarget: z.number().int().positive().max(20000),
    weeklyTarget: z.number().int().positive().max(1000000),
    timezone: z
      .string()
      .max(100)
      .refine(value => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value })
          return true
        } catch {
          return false
        }
      })
  })
  .strict()
export const itemInput = z
  .object({
    title,
    kind: z.enum(itemKinds),
    stat: statCode,
    skillId: uuid.nullable(),
    parentId: uuid.nullable(),
    difficulty: z.enum([
      'trivial',
      'easy',
      'medium',
      'hard',
      'expert',
      'mythic'
    ]),
    baseXP: z.number().int().min(1).max(10000),
    due: date.nullable(),
    notes: z.string().max(10000).default('')
  })
  .strict()
const itemSchema = itemInput.extend({
  id: uuid,
  archived: z.boolean(),
  created: z.string()
})
const skillSchema = z.object({ id: uuid, name: title, stat: statCode })
const entrySchema = z.object({
  id: uuid,
  itemId: uuid,
  title,
  stat: statCode,
  skillId: uuid.nullable(),
  kind: z.enum(itemKinds),
  occurrence: z.string(),
  xp: z.number().int().nonnegative(),
  quality: z.enum(['minimum', 'done', 'strong', 'excellent']),
  at: z.string(),
  day: date,
  voided: z.boolean()
})
const vitalSchema = z.object({
  id: uuid,
  kind: z.enum(['calories', 'water']),
  amount: z.number().positive().max(20000),
  day: date,
  at: z.string()
})
const rewardSchema = z.object({
  id: uuid,
  title,
  cost: z.number().int().min(1).max(100000)
})
const redemptionSchema = z.object({
  id: uuid,
  rewardId: uuid,
  title,
  cost: z.number().int().positive(),
  at: z.string(),
  day: date,
  voided: z.boolean()
})
const debuffInput = z.object({
  title,
  stat: statCode,
  reduction: z.number().min(0).max(0.5),
  recovery: title
})
const encounterInput = z.object({
  title,
  day: date,
  minutes: z.number().int().min(1).max(1440),
  kind: z.enum(['focus', 'recovery', 'distraction']),
  itemId: uuid.nullable()
})
export const campaignSchema = z.object({
  revision: z.number().int().nonnegative(),
  character: characterSchema,
  skills: z.array(skillSchema),
  items: z.array(itemSchema),
  ledger: z.array(entrySchema),
  vitals: z.array(vitalSchema),
  rewards: z.array(rewardSchema),
  redemptions: z.array(redemptionSchema),
  debuffs: z.array(
    debuffInput.extend({
      id: uuid,
      at: z.string(),
      recoveredAt: z.string().nullable()
    })
  ),
  encounters: z.array(encounterInput.extend({ id: uuid, at: z.string() }))
})
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), value: characterSchema }),
  z.object({ type: z.literal('item'), id: uuid, value: itemInput }),
  z.object({ type: z.literal('archive'), id: uuid, archived: z.boolean() }),
  z.object({
    type: z.literal('complete'),
    id: uuid,
    quality: z.enum(['minimum', 'done', 'strong', 'excellent'])
  }),
  z.object({ type: z.literal('undo'), id: uuid }),
  z.object({ type: z.literal('skill'), id: uuid, name: title, stat: statCode }),
  z.object({
    type: z.literal('vital'),
    id: uuid,
    kind: z.enum(['calories', 'water']),
    amount: z.number().positive().max(20000)
  }),
  z.object({ type: z.literal('removeVital'), id: uuid }),
  z.object({
    type: z.literal('reward'),
    id: uuid,
    title,
    cost: z.number().int().min(1).max(100000)
  }),
  z.object({ type: z.literal('redeem'), id: uuid, rewardId: uuid }),
  z.object({ type: z.literal('refund'), id: uuid }),
  z.object({ type: z.literal('debuff'), id: uuid, value: debuffInput }),
  z.object({ type: z.literal('recover'), id: uuid }),
  z.object({ type: z.literal('encounter'), id: uuid, value: encounterInput }),
  z.object({ type: z.literal('removeEncounter'), id: uuid })
])
export type Campaign = z.infer<typeof campaignSchema>
export type Character = z.infer<typeof characterSchema>
export type RPGItem = z.infer<typeof itemSchema>
export type RPGCommand = z.infer<typeof commandSchema>

export function dayKey(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  return ['year', 'month', 'day']
    .map(key => parts.find(p => p.type === key)!.value)
    .join('-')
}
export function weekKey(day: string) {
  const value = new Date(`${day}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7))
  return value.toISOString().slice(0, 10)
}
export function periodStart(
  day: string,
  period: 'day' | 'week' | 'month' | 'season' | 'year'
) {
  if (period === 'week') return weekKey(day)
  if (period === 'month') return day.slice(0, 7) + '-01'
  if (period === 'year') return day.slice(0, 4) + '-01-01'
  if (period === 'season')
    return `${day.slice(0, 4)}-${String(Math.floor((Number(day.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, '0')}-01`
  return day
}
export function levelProgress(xp: number) {
  const total = Math.max(0, Math.floor(xp))
  // Each next level costs 500 more XP: 500, 1000, 1500…
  const level = Math.floor((1 + Math.sqrt(1 + total / 62.5)) / 2)
  const current = total - 250 * level * (level - 1)
  return {
    level,
    current,
    required: 500 * level,
    progress: current / (500 * level)
  }
}
export function occurrence(item: Pick<RPGItem, 'id' | 'kind'>, day: string) {
  return `${item.id}:${item.kind === 'daily' ? day : item.kind === 'weekly' ? weekKey(day) : 'once'}`
}
export function completion(state: Campaign, item: RPGItem, day: string) {
  return state.ledger.find(
    entry => !entry.voided && entry.occurrence === occurrence(item, day)
  )
}
export function earnedXP(state: Campaign, from = '', until = '9999-12-31') {
  return state.ledger
    .filter(e => !e.voided && e.day >= from && e.day <= until)
    .reduce((sum, e) => sum + e.xp, 0)
}
export function coins(state: Campaign, day: string) {
  const week = weekKey(day)
  const earned = state.ledger
    .filter(e => !e.voided && weekKey(e.day) === week)
    .reduce((sum, e) => sum + e.xp, 0)
  const spent = state.redemptions
    .filter(e => !e.voided && weekKey(e.day) === week)
    .reduce((sum, e) => sum + e.cost, 0)
  return Math.floor(earned / 10) - spent
}
export function previewXP(
  state: Campaign,
  item: z.infer<typeof itemInput>,
  result: keyof typeof quality
) {
  const penalty = state.debuffs
    .filter(d => !d.recoveredAt && d.stat === item.stat)
    .reduce((value, d) => value * (1 - d.reduction), 1)
  return Math.floor(
    item.baseXP *
      difficulty[item.difficulty] *
      quality[result] *
      Math.max(0.5, penalty)
  )
}
export function newCampaign(character: Character, id: () => string): Campaign {
  return {
    revision: 0,
    character,
    skills: Object.entries(stats).flatMap(([stat, meta]) =>
      meta.skills.map(name => ({ id: id(), name, stat: stat as StatCode }))
    ),
    items: [],
    ledger: [],
    vitals: [],
    rewards: [],
    redemptions: [],
    debuffs: [],
    encounters: []
  }
}

/** Pure command reducer; the server owns time, validation, locking and persistence. */
export function applyCommand(
  current: Campaign,
  command: RPGCommand,
  now: Date,
  makeId: () => string
): Campaign {
  const state = structuredClone(current)
  const day = dayKey(now, state.character.timezone),
    at = now.toISOString()
  const requireItem = (id: string) => {
    const item = state.items.find(i => i.id === id)
    if (!item) throw Error('Item not found')
    return item
  }
  switch (command.type) {
    case 'profile':
      state.character = command.value
      break
    case 'item': {
      const { id, value } = command
      const previous = state.items.find(i => i.id === id)
      if (
        value.skillId &&
        !state.skills.some(s => s.id === value.skillId && s.stat === value.stat)
      )
        throw Error('Choose a skill from this stat')
      if (
        previous &&
        state.ledger.some(e => e.itemId === id) &&
        previous.kind !== value.kind
      )
        throw Error('An item with completion history keeps its original type')
      const parentKind = {
        mission: 'epic',
        quest: 'mission',
        challenge: 'quest',
        action: 'challenge'
      }[value.kind as 'mission' | 'quest' | 'challenge' | 'action']
      if (
        value.parentId &&
        (value.parentId === id ||
          requireItem(value.parentId).kind !== parentKind ||
          requireItem(value.parentId).archived)
      )
        throw Error('Choose a parent from the preceding level of the hierarchy')
      if (
        previous &&
        state.items.some(i => i.parentId === id) &&
        previous.kind !== value.kind
      )
        throw Error('Move child items before changing this type')
      const next = {
        ...value,
        id,
        archived: previous?.archived ?? false,
        created: previous?.created ?? at
      }
      state.items = previous
        ? state.items.map(i => (i.id === id ? next : i))
        : [...state.items, next]
      break
    }
    case 'archive':
      requireItem(command.id).archived = command.archived
      break
    case 'complete': {
      const item = requireItem(command.id)
      if (item.archived) throw Error('Restore this item before completing it')
      if (completion(state, item, day)) return current
      state.ledger.push({
        id: makeId(),
        itemId: item.id,
        title: item.title,
        kind: item.kind,
        stat: item.stat,
        skillId: item.skillId,
        occurrence: occurrence(item, day),
        xp: previewXP(state, item, command.quality),
        quality: command.quality,
        at,
        day,
        voided: false
      })
      break
    }
    case 'undo': {
      const entry = state.ledger.find(e => e.id === command.id)
      if (!entry) throw Error('Completion not found')
      if (entry.voided) return current
      entry.voided = true
      if (coins(state, entry.day) < 0)
        throw Error('Refund rewards from this week before undoing this XP')
      break
    }
    case 'skill': {
      if (state.skills.some(s => s.id === command.id)) return current
      if (
        state.skills.some(
          s =>
            s.stat === command.stat &&
            s.name.toLowerCase() === command.name.toLowerCase()
        )
      )
        throw Error('This skill already exists')
      state.skills.push({
        id: command.id,
        name: command.name,
        stat: command.stat
      })
      break
    }
    case 'vital':
      if (state.vitals.some(v => v.id === command.id)) return current
      state.vitals.push({
        id: command.id,
        kind: command.kind,
        amount: command.amount,
        day,
        at
      })
      break
    case 'removeVital':
      state.vitals = state.vitals.filter(v => v.id !== command.id)
      break
    case 'reward': {
      const reward = {
        id: command.id,
        title: command.title,
        cost: command.cost
      }
      state.rewards = state.rewards.some(r => r.id === command.id)
        ? state.rewards.map(r => (r.id === command.id ? reward : r))
        : [...state.rewards, reward]
      break
    }
    case 'redeem': {
      if (state.redemptions.some(r => r.id === command.id)) return current
      const reward = state.rewards.find(r => r.id === command.rewardId)
      if (!reward) throw Error('Reward not found')
      if (coins(state, day) < reward.cost)
        throw Error('Earn more coins this week to unlock this reward')
      state.redemptions.push({
        id: command.id,
        rewardId: reward.id,
        title: reward.title,
        cost: reward.cost,
        at,
        day,
        voided: false
      })
      break
    }
    case 'refund': {
      const redemption = state.redemptions.find(r => r.id === command.id)
      if (!redemption) throw Error('Reward redemption not found')
      redemption.voided = true
      break
    }
    case 'debuff':
      if (state.debuffs.some(d => d.id === command.id)) return current
      state.debuffs.push({
        ...command.value,
        id: command.id,
        at,
        recoveredAt: null
      })
      break
    case 'recover': {
      const debuff = state.debuffs.find(d => d.id === command.id)
      if (!debuff) throw Error('Debuff not found')
      debuff.recoveredAt = at
      break
    }
    case 'encounter':
      if (command.value.itemId) requireItem(command.value.itemId)
      if (state.encounters.some(e => e.id === command.id)) return current
      state.encounters.push({ ...command.value, id: command.id, at })
      break
    case 'removeEncounter':
      state.encounters = state.encounters.filter(e => e.id !== command.id)
      break
  }
  state.revision++
  return campaignSchema.parse(state)
}
