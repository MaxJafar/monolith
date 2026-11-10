import type { SetupInput } from '../../../core/schemas'

/** The validated categorical order; later groups use the neutral fallback. */
export const SERIES = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948'
] as const

type Translate = (key: string) => string

const rules = (t: Translate): SetupInput['tax_rules'] => [
  {
    key: 'digital_vat',
    name: t('presets.rules.digital_vat'),
    kind: 'vat',
    rate: '18',
    inclusive: false,
    notes: t('presets.rules.digital_vat_note')
  },
  {
    key: 'vat_included',
    name: t('presets.rules.vat_included'),
    kind: 'vat',
    rate: '18',
    inclusive: true
  },
  {
    key: 'voen_simplified',
    name: t('presets.rules.voen_simplified'),
    kind: 'income',
    withheld: false,
    components: [
      {
        label: t('presets.rules.simplified_tax'),
        brackets: [{ up_to: null, rate: '2' }]
      }
    ],
    notes: t('presets.rules.voen_note')
  },
  {
    key: 'salary_az',
    name: t('presets.rules.salary_az'),
    kind: 'income',
    withheld: true,
    components: [
      {
        label: t('presets.rules.income_tax'),
        brackets: [
          { up_to: '2500', rate: '3' },
          { up_to: '8000', rate: '10' },
          { up_to: null, rate: '14' }
        ]
      },
      {
        label: t('presets.rules.social'),
        brackets: [
          { up_to: '200', rate: '3' },
          { up_to: null, rate: '10' }
        ]
      },
      {
        label: t('presets.rules.unemployment'),
        brackets: [{ up_to: null, rate: '0.5' }]
      },
      {
        label: t('presets.rules.medical'),
        brackets: [
          { up_to: '8000', rate: '2' },
          { up_to: null, rate: '0.5' }
        ]
      }
    ],
    notes: t('presets.rules.salary_note')
  }
]

type Group = {
  key: string
  icon: string
  color?: string
  rule?: string
  children: [string, string][]
}

const expenseGroups: Group[] = [
  {
    key: 'household',
    icon: 'tabler:home',
    color: SERIES[0],
    children: [
      ['rent', 'tabler:key'],
      ['utilities', 'tabler:bulb'],
      ['internet', 'tabler:wifi'],
      ['pet_food', 'tabler:paw'],
      ['litter', 'tabler:trash'],
      ['cleaning', 'tabler:spray'],
      ['home_goods', 'tabler:armchair']
    ]
  },
  {
    key: 'food',
    icon: 'tabler:tools-kitchen-2',
    color: SERIES[1],
    children: [
      ['groceries', 'tabler:basket'],
      ['delivery', 'tabler:moped'],
      ['restaurants', 'tabler:chef-hat'],
      ['coffee', 'tabler:coffee']
    ]
  },
  {
    key: 'transport',
    icon: 'tabler:car',
    color: SERIES[2],
    children: [
      ['taxi', 'tabler:car-suv'],
      ['fuel', 'tabler:gas-station'],
      ['public_transport', 'tabler:bus']
    ]
  },
  {
    key: 'subscriptions',
    icon: 'tabler:device-tv',
    color: SERIES[3],
    rule: 'digital_vat',
    children: [
      ['ai_tools', 'tabler:sparkles'],
      ['streaming', 'tabler:player-play'],
      ['software', 'tabler:app-window'],
      ['mobile', 'tabler:device-mobile']
    ]
  },
  {
    key: 'health',
    icon: 'tabler:heart',
    color: SERIES[4],
    children: [
      ['medicine', 'tabler:pill'],
      ['gym', 'tabler:barbell'],
      ['supplements', 'tabler:bottle'],
      ['care', 'tabler:scissors']
    ]
  },
  {
    key: 'personal',
    icon: 'tabler:shirt',
    color: SERIES[5],
    children: [
      ['clothing', 'tabler:hanger'],
      ['electronics', 'tabler:device-laptop'],
      ['hobbies', 'tabler:music']
    ]
  },
  {
    key: 'social',
    icon: 'tabler:confetti',
    color: SERIES[6],
    children: [
      ['gifts', 'tabler:gift'],
      ['dates', 'tabler:heart-handshake'],
      ['going_out', 'tabler:glass-full']
    ]
  },
  {
    key: 'debt',
    icon: 'tabler:credit-card',
    color: SERIES[7],
    children: [
      ['loan', 'tabler:building-bank'],
      ['repayments', 'tabler:arrow-back-up'],
      ['fees', 'tabler:receipt']
    ]
  },
  {
    key: 'shopping',
    icon: 'tabler:shopping-bag',
    children: [
      ['online_orders', 'tabler:package'],
      ['customs', 'tabler:building-warehouse']
    ]
  },
  {
    key: 'travel',
    icon: 'tabler:plane',
    children: [
      ['trips', 'tabler:map-2'],
      ['stays', 'tabler:bed']
    ]
  }
]

const incomeStreams: [string, string, string, string?][] = [
  ['salary', 'tabler:briefcase', SERIES[5], 'salary_az'],
  ['freelance', 'tabler:file-invoice', SERIES[2], 'voen_simplified'],
  ['business', 'tabler:building-store', SERIES[0]],
  ['investments', 'tabler:chart-line', SERIES[6]],
  ['gifts_received', 'tabler:gift', SERIES[4]],
  ['other_income', 'tabler:dots', '']
]

export type PresetChoice = {
  base: string
  currencies: string[]
  accounts: boolean
  categories: boolean
  taxes: boolean
  wishlists: boolean
}

/** Starting points, named in the viewer's language and fully editable later. */
export function buildSetup(t: Translate, choice: PresetChoice): SetupInput {
  const second = choice.base === 'USD' ? 'EUR' : 'USD'
  const taxRules = choice.taxes ? rules(t) : []
  const ruleKeys = new Set(taxRules.map(rule => rule.key))
  const ruleFor = (key?: string) => (key && ruleKeys.has(key) ? key : null)
  const categories: SetupInput['categories'] = []

  if (choice.categories) {
    expenseGroups.forEach((group, groupIndex) => {
      categories.push({
        key: group.key,
        name: t(`presets.categories.${group.key}`),
        kind: 'expense',
        icon: group.icon,
        color: group.color ?? '',
        sort: groupIndex * 100,
        tax_rule_key: ruleFor(group.rule)
      })
      group.children.forEach(([key, icon], index) =>
        categories.push({
          key,
          name: t(`presets.categories.${key}`),
          kind: 'expense',
          icon,
          color: group.color ?? '',
          sort: groupIndex * 100 + index + 1,
          parent_key: group.key,
          tax_rule_key: ruleFor(group.rule)
        })
      )
    })
    incomeStreams.forEach(([key, icon, color, rule], index) =>
      categories.push({
        key,
        name: t(`presets.categories.${key}`),
        kind: 'income',
        icon,
        color,
        sort: index,
        tax_rule_key: ruleFor(rule)
      })
    )
  }

  const accounts: SetupInput['accounts'] = choice.accounts
    ? [
        ['cash', 'cash', choice.base, 'tabler:cash'],
        ['bank_a', 'bank', choice.base, 'tabler:building-bank'],
        ['bank_b', 'card', choice.base, 'tabler:credit-card'],
        ['bank_c', 'bank', second, 'tabler:world'],
        ['crypto', 'crypto', 'USDT', 'tabler:currency-bitcoin'],
        ['deposit', 'savings', choice.base, 'tabler:pig-money']
      ].map(([key, kind, currency, icon], index) => ({
        key: key!,
        name: t(`presets.accounts.${key}`),
        kind: kind as 'bank',
        currency: currency!,
        icon: icon!,
        color: SERIES[index] ?? '',
        sort: index,
        interest_rate: kind === 'savings' ? '10.5' : null
      }))
    : []

  const lists: SetupInput['lists'] = choice.wishlists
    ? [
        ['tech', 'tabler:device-desktop'],
        ['clothing_list', 'tabler:shirt'],
        ['shoes', 'tabler:shoe'],
        ['sport', 'tabler:ball-football'],
        ['home_list', 'tabler:sofa'],
        ['music_gear', 'tabler:headphones'],
        ['someday', 'tabler:star']
      ].map(([key, icon], index) => ({
        key: key!,
        name: t(`presets.lists.${key}`),
        icon: icon!,
        color: SERIES[index] ?? '',
        sort: index
      }))
    : []

  return {
    base_currency: choice.base,
    currencies: [...new Set([choice.base, ...choice.currencies])],
    accounts,
    tax_rules: taxRules,
    categories,
    lists,
    wish_category_key: choice.categories ? 'online_orders' : null
  }
}
