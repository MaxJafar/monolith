// SPDX-License-Identifier: 0BSD
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Flex, Text } from '@/components/primitives'

import { Button } from '../Button'
import { ComboboxInput } from '../ComboboxInput'
import { ComboboxOption } from '../ComboboxInput/components/ComboboxOption'
import type { InputVariants } from '../shared/types'
import { type Location, useLocationSearch } from './search'

export type { Location } from './search'

export type LocationInputProps = {
  value: Location | null
  onChange: (location: Location | null) => void
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  namespace?: string | false
  errorMsg?: string
  onEnter?: () => void
}
export function LocationInput({
  value,
  onChange,
  disabled = false,
  icon = 'tabler:map-pin',
  ...presentation
}: LocationInputProps & InputVariants) {
  const [query, setQuery] = useState('')
  const state = useLocationSearch(query, disabled)
  const { t } = useTranslation('common.inputs')
  const serviceError = !disabled && state.capability.isError
  const unavailable = !disabled && state.capability.data === false
  return (
    <Flex direction="column" gap="xs" minWidth="0" width="100%">
      <ComboboxInput<Location | null>
        {...presentation}
        icon={icon}
        value={value}
        disabled={disabled || !state.enabled}
        displayValue={location => location?.name ?? ''}
        onChange={location => onChange(location ?? null)}
        onQueryChanged={setQuery}
      >
        {state.results.map((location, index) => (
          <ComboboxOption
            key={location.name + ':' + index}
            value={location}
            label={
              <Flex direction="column" minWidth="0">
                <Text truncate>{location.name}</Text>
                <Text size="sm" color="muted" truncate>
                  {location.formattedAddress}
                </Text>
              </Flex>
            }
          />
        ))}
        {state.term && state.waiting && (
          <Text role="status" color="muted" p="sm">
            {t('locationSearch.searching')}
          </Text>
        )}
        {state.term && !state.waiting && state.search.isError && (
          <Text role="status" p="sm" color="dangerous">
            {t('locationSearch.failed')}
          </Text>
        )}
        {state.term &&
          !state.waiting &&
          !state.search.isError &&
          !state.results.length && (
            <Text role="status" p="sm" color="muted">
              {t('locationSearch.empty')}
            </Text>
          )}
      </ComboboxInput>
      {!disabled && state.capability.isPending && (
        <Text role="status" size="sm" color="muted">
          {t('locationSearch.checking')}
        </Text>
      )}
      {unavailable && (
        <Text role="status" size="sm" color="muted">
          {t('locationSearch.unconfigured')}
        </Text>
      )}
      {serviceError && (
        <Flex align="center" gap="sm">
          <Text role="alert" size="sm" color="dangerous">
            {t('locationSearch.serviceFailed')}
          </Text>
          <Button
            variant="plain"
            icon="tabler:refresh"
            onClick={() => {
              void state.capability.refetch()
            }}
          >
            retry
          </Button>
        </Flex>
      )}
    </Flex>
  )
}
