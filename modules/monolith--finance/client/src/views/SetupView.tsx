import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import { Button, Card, Flex, Icon, Stack, TagChip, Text } from '@monolith/ui'

import { FIAT_CODES } from '../../../core/currencies'
import { setupInputSchema } from '../../../core/schemas'
import { workspaceAPI } from '../../manifest'
import { useFinance } from '../FinanceContext'
import { SelectInput, SwitchRow } from '../components/controls'
import { currencyOptions } from '../utils/options'
import { type PresetChoice, buildSetup } from '../utils/presets'

/** First run: choose a main currency and which starting points to create. */
export default function SetupView() {
  const finance = useFinance()
  const { t } = useModuleTranslation()

  const [choice, setChoice] = useState<PresetChoice>({
    base: 'AZN',
    currencies: ['USD', 'EUR', 'USDT'],
    accounts: true,
    categories: true,
    taxes: true,
    wishlists: true
  })

  const [adding, setAdding] = useState('')

  const set = (patch: Partial<PresetChoice>) =>
    setChoice(current => ({ ...current, ...patch }))

  async function apply(empty: boolean) {
    await finance.run(() =>
      workspaceAPI.setup.apply.mutate(
        setupInputSchema.parse(
          buildSetup(
            t,
            empty
              ? {
                  ...choice,
                  accounts: false,
                  categories: false,
                  taxes: false,
                  wishlists: false
                }
              : choice
          )
        )
      )
    )
  }

  return (
    <Card className="finance-setup finance-rise" gap="lg">
      <Flex align="center" gap="md">
        <span aria-hidden="true" className="finance-setup-mark">
          <Icon icon="tabler:wallet" />
        </span>
        <Stack gap="xs">
          <Text as="h2" size="2xl" weight="semibold">
            {t('setup.title')}
          </Text>
          <Text color="muted">{t('setup.subtitle')}</Text>
        </Stack>
      </Flex>
      <div className="finance-fields">
        <SelectInput
          icon="tabler:home-dollar"
          label="baseCurrency"
          options={currencyOptions(finance).filter(option =>
            FIAT_CODES.includes(option.value)
          )}
          value={choice.base}
          onChange={base =>
            set({
              base,
              currencies: choice.currencies.filter(code => code !== base)
            })
          }
        />
        <Flex align="end" gap="sm">
          <SelectInput
            icon="tabler:plus"
            label="addCurrency"
            options={[
              { value: '', label: t('labels.chooseCurrency') },
              ...currencyOptions(finance).filter(
                option =>
                  option.value !== choice.base &&
                  !choice.currencies.includes(option.value)
              )
            ]}
            value={adding}
            onChange={code => {
              if (code) set({ currencies: [...choice.currencies, code] })
              setAdding('')
            }}
          />
        </Flex>
      </div>
      <Flex gap="sm" wrap="wrap">
        {choice.currencies.map(code => (
          <TagChip
            key={code}
            actionButtonProps={{
              icon: 'tabler:x',
              onClick: () =>
                set({
                  currencies: choice.currencies.filter(item => item !== code)
                })
            }}
            label={code}
            variant="outlined"
          />
        ))}
      </Flex>
      <Stack gap="sm">
        <SwitchRow
          description="setup.accountsHelp"
          label="setup.accounts"
          value={choice.accounts}
          onChange={accounts => set({ accounts })}
        />
        <SwitchRow
          description="setup.categoriesHelp"
          label="setup.categories"
          value={choice.categories}
          onChange={categories => set({ categories })}
        />
        <SwitchRow
          description="setup.taxesHelp"
          label="setup.taxes"
          value={choice.taxes}
          onChange={taxes => set({ taxes })}
        />
        <SwitchRow
          description="setup.wishlistsHelp"
          label="setup.wishlists"
          value={choice.wishlists}
          onChange={wishlists => set({ wishlists })}
        />
      </Stack>
      <Text color="muted" size="sm">
        {t('setup.editable')}
      </Text>
      <Flex gap="sm" wrap="wrap">
        <Button
          icon="tabler:sparkles"
          loading={finance.pending}
          onClick={() => void apply(false)}
        >
          startSetup
        </Button>
        <Button
          disabled={finance.pending}
          variant="secondary"
          onClick={() => void apply(true)}
        >
          startEmpty
        </Button>
      </Flex>
    </Card>
  )
}
