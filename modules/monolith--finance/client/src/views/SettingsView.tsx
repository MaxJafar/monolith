import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Stack, TagChip, Text } from '@monolith/ui'

import { currencyInfo } from '../../../core/currencies'
import { convert, crossRate } from '../../../core/fx'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { stripSettings } from '../FinanceProvider'
import { AmountInput, SelectInput } from '../components/controls'
import { formatInstant, formatRate } from '../utils/format'
import {
  accountOptions,
  categoryOptions,
  currencyOptions
} from '../utils/options'

export default function SettingsView() {
  return (
    <>
      <Converter />
      <Rates />
      <Preferences />
    </>
  )
}

function Preferences() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const settings = finance.data!.settings

  const [draft, setDraft] = useState(() => stripSettings(settings))
  const [message, setMessage] = useState('')

  const set = (patch: Partial<typeof draft>) =>
    setDraft(current => ({ ...current, ...patch }))
  const changed =
    JSON.stringify(draft) !== JSON.stringify(stripSettings(settings))
  const rebasing = draft.base_currency !== settings.base_currency

  const [adding, setAdding] = useState('')

  async function save() {
    setMessage('')

    const result = await finance.run(
      () =>
        workspaceAPI.settings.save.mutate({
          ...draft,
          expected_updated: settings.updated
        }),
      { quiet: true }
    )

    setMessage(result.ok ? t('settings.saved') : result.error)
  }

  return (
    <Card gap="md">
      <Text as="h2" size="lg" weight="semibold">
        {t('settings.preferences')}
      </Text>
      <div className="finance-fields">
        <SelectInput
          icon="tabler:home-dollar"
          label="baseCurrency"
          options={currencyOptions(finance).filter(
            option => !currencyInfo(option.value).crypto
          )}
          value={draft.base_currency}
          onChange={base_currency => set({ base_currency })}
        />
        <SelectInput
          icon="tabler:eye"
          label="displayCurrency"
          options={currencyOptions(finance)}
          value={draft.display_currency}
          onChange={display_currency => set({ display_currency })}
        />
        <SelectInput
          icon="tabler:calendar-week"
          label="weekStart"
          options={[1, 6, 7].map(day => ({
            value: String(day),
            label: t(`settings.weekdays.${day}`)
          }))}
          value={String(draft.week_start)}
          onChange={value => set({ week_start: Number(value) })}
        />
        <SelectInput
          label="defaultAccount"
          options={[
            {
              value: '',
              label: t('labels.none'),
              icon: 'tabler:circle-dashed'
            },
            ...accountOptions(finance)
          ]}
          value={draft.default_account_id ?? ''}
          onChange={id => set({ default_account_id: id || null })}
        />
        <SelectInput
          label="wishCategory"
          options={categoryOptions(finance, 'expense', t('labels.none'))}
          value={draft.wish_category_id ?? ''}
          onChange={id => set({ wish_category_id: id || null })}
        />
      </div>
      {rebasing && (
        <Text color="dangerous" role="alert" size="sm">
          {t('settings.rebaseWarning', {
            from: settings.base_currency,
            to: draft.base_currency
          })}
        </Text>
      )}
      <Stack gap="sm">
        <Text weight="medium">{t('settings.currencies')}</Text>
        <Text color="muted" size="sm">
          {t('settings.currenciesHelp')}
        </Text>
        <Flex gap="sm" wrap="wrap">
          {draft.currencies.map(code => (
            <TagChip
              key={code}
              actionButtonProps={
                code === draft.base_currency || code === draft.display_currency
                  ? undefined
                  : {
                      icon: 'tabler:x',
                      onClick: () =>
                        set({
                          currencies: draft.currencies.filter(
                            item => item !== code
                          )
                        })
                    }
              }
              icon={
                currencyInfo(code).crypto
                  ? 'tabler:currency-bitcoin'
                  : 'tabler:currency'
              }
              label={code}
              variant="outlined"
            />
          ))}
        </Flex>
        <Flex align="end" gap="sm" wrap="wrap">
          <SelectInput
            icon="tabler:plus"
            label="addCurrency"
            options={[
              { value: '', label: t('labels.chooseCurrency') },
              ...currencyOptions(finance).filter(
                option => !draft.currencies.includes(option.value)
              )
            ]}
            value={adding}
            onChange={setAdding}
          />
          <Button
            disabled={!adding}
            icon="tabler:plus"
            variant="secondary"
            onClick={() => {
              set({ currencies: [...draft.currencies, adding] })
              setAdding('')
            }}
          >
            add
          </Button>
        </Flex>
      </Stack>
      <Flex align="center" gap="sm" wrap="wrap">
        <Button
          disabled={!changed}
          icon="tabler:check"
          loading={finance.pending}
          onClick={() => void save()}
        >
          save
        </Button>
        {message && (
          <Text
            color={message === t('settings.saved') ? 'muted' : 'dangerous'}
            role="status"
            size="sm"
          >
            {message}
          </Text>
        )}
      </Flex>
    </Card>
  )
}

function Rates() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const book = finance.book!
  const entries = Object.values(book.entries).filter(
    entry => entry.code !== book.base
  )

  const [status, setStatus] = useState('')

  async function refresh() {
    setStatus('')

    const result = await finance.run(
      () => workspaceAPI.rates.refresh.mutate(undefined),
      { quiet: true }
    )

    setStatus(
      result.ok
        ? result.value.failed.length
          ? t('rates.partial', { codes: result.value.failed.join(', ') })
          : t('rates.refreshed')
        : result.error
    )
  }

  return (
    <Card gap="md">
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Stack gap="xs">
          <Text as="h2" size="lg" weight="semibold">
            {t('rates.title')}
          </Text>
          <Text color="muted" size="sm">
            {t('rates.help', { base: book.base })}
          </Text>
        </Stack>
        <Button
          icon="tabler:refresh"
          loading={finance.pending}
          variant="secondary"
          onClick={() => void refresh()}
        >
          refreshRates
        </Button>
      </Flex>
      {status && (
        <Text color="muted" role="status" size="sm">
          {status}
        </Text>
      )}
      <ul className="finance-rates">
        {entries.map(entry => (
          <RateRow key={entry.code} code={entry.code} />
        ))}
      </ul>
    </Card>
  )
}

function RateRow({ code }: { code: string }) {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const entry = finance.book!.entries[code]!

  const [custom, setCustom] = useState<string | null>(entry.custom)
  const [error, setError] = useState('')

  const base = finance.book!.base

  async function pin(value: string | null) {
    setError('')

    const result = await finance.run(
      () => workspaceAPI.rates.save.mutate({ code, custom_rate: value }),
      { quiet: true }
    )

    if (!result.ok) setError(result.error)
    else if (value === null) setCustom(null)
  }

  return (
    <li className="finance-rate" data-source={entry.source}>
      <Stack gap="none" minWidth="7rem">
        <Text weight="semibold">{code}</Text>
        <Text color="muted" size="xs">
          {t(`rates.sources.${entry.source}`)}
        </Text>
      </Stack>
      <Stack flex="1" gap="none" minWidth="10rem">
        <Text className="finance-figure">
          {entry.rate
            ? `1 ${code} = ${formatRate(entry.rate, finance.locale)} ${base}`
            : t('rates.none')}
        </Text>
        <Text color="muted" size="xs">
          {entry.market
            ? t('rates.market', {
                rate: formatRate(entry.market, finance.locale),
                base,
                at: entry.market_at
                  ? formatInstant(entry.market_at, finance.locale)
                  : '—'
              })
            : t('rates.noMarket')}
        </Text>
      </Stack>
      <Flex align="end" gap="xs" wrap="wrap">
        <AmountInput
          icon="tabler:pin"
          label="customRate"
          suffix={base}
          value={custom}
          onChange={setCustom}
        />
        <Button
          disabled={!custom || custom === entry.custom}
          icon="tabler:check"
          variant="secondary"
          onClick={() => void pin(custom)}
        >
          pin
        </Button>
        {entry.custom && (
          <Button
            icon="tabler:pinned-off"
            variant="plain"
            onClick={() => void pin(null)}
          >
            useMarket
          </Button>
        )}
      </Flex>
      {error && (
        <Text color="dangerous" role="alert" size="xs">
          {error}
        </Text>
      )}
    </li>
  )
}

function Converter() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const codes = finance.data!.settings.currencies

  const [amount, setAmount] = useState<string | null>('100')

  const [from, setFrom] = useState(
    codes.find(code => code !== finance.base) ?? 'USD'
  )

  const [to, setTo] = useState(finance.base)

  const book = finance.book!
  const result = amount ? convert(book, amount, from, to) : null
  const rate = crossRate(book, from, to)

  return (
    <Card className="finance-converter" gap="md">
      <Text as="h2" size="lg" weight="semibold">
        {t('converter.title')}
      </Text>
      <div className="finance-converter-row">
        <AmountInput
          label="amount"
          suffix={from}
          value={amount}
          onChange={setAmount}
        />
        <SelectInput
          icon="tabler:currency"
          label="from"
          options={currencyOptions(finance)}
          value={from}
          onChange={setFrom}
        />
        <Button
          aria-label={t('converter.swap')}
          icon="tabler:arrows-left-right"
          variant="plain"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
        />
        <SelectInput
          icon="tabler:currency"
          label="to"
          options={currencyOptions(finance)}
          value={to}
          onChange={setTo}
        />
      </div>
      <Flex align="baseline" gap="md" wrap="wrap">
        <Text className="finance-hero-value" weight="semibold">
          {result === null ? t('rates.none') : finance.native(result, to)}
        </Text>
        {rate && (
          <Text color="muted" size="sm">
            1 {from} = {formatRate(rate, finance.locale)} {to}
          </Text>
        )}
      </Flex>
      {result === null && (
        <Text color="muted" size="sm">
          {t('converter.missing')}
        </Text>
      )}
    </Card>
  )
}
