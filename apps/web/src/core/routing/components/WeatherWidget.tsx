import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Box,
  Button,
  type CanvasWidgetConfiguration,
  Flex,
  Icon,
  Stack,
  Text
} from '@monolith/ui'

type Place = { name: string; latitude: number; longitude: number }

function readPlace(value: string): Place | null {
  try {
    const place = JSON.parse(value) as Place

    return typeof place.name === 'string' &&
      place.name.length <= 200 &&
      Number.isFinite(place.latitude) &&
      Math.abs(place.latitude) <= 90 &&
      Number.isFinite(place.longitude) &&
      Math.abs(place.longitude) <= 180
      ? place
      : null
  } catch {
    return null
  }
}

export function WeatherWidget({
  configuration,
  readOnly
}: {
  configuration?: CanvasWidgetConfiguration
  readOnly: boolean
}) {
  const { t, i18n } = useTranslation('common.widgets')

  const place = readPlace(configuration?.filter ?? '')
  const [city, setCity] = useState(''),
    [query, setQuery] = useState(''),
    [searchAttempt, setSearchAttempt] = useState(0),
    [choices, setChoices] = useState<Place[]>([])
  const [choosing, setChoosing] = useState(false),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState('')
  const [weather, setWeather] = useState<{
    temperature: number
    code: number
    wind: number
    time: string
  } | null>(null)
  const [error, setError] = useState(false),
    [retry, setRetry] = useState(0)
  const canConfigure = !readOnly && !!configuration?.onConfigChange
  const latitude = place?.latitude,
    longitude = place?.longitude
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return

    const abort = new AbortController()
    setWeather(null)
    setError(false)
    const load = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,weather_code,wind_speed_10m', timezone: 'auto' })}`,
          { signal: abort.signal }
        )

        if (!response.ok) throw Error('weather unavailable')

        const { current } = await response.json()

        if (
          ![
            current?.temperature_2m,
            current?.weather_code,
            current?.wind_speed_10m
          ].every(Number.isFinite) ||
          typeof current?.time !== 'string'
        )
          throw Error('invalid weather')

        if (!abort.signal.aborted) {
          setWeather({
            temperature: current.temperature_2m,
            code: current.weather_code,
            wind: current.wind_speed_10m,
            time: current.time
          })
          setError(false)
        }
      } catch {
        if (!abort.signal.aborted) setError(true)
      }
    }
    void load()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 15 * 60_000)

    return () => {
      abort.abort()
      clearInterval(interval)
    }
  }, [latitude, longitude, retry])
  useEffect(() => {
    if (query.length < 2) return

    const abort = new AbortController()
    setSearching(true)
    setSearchError('')
    setChoices([])
    void fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: '5', language: i18n.language.split('-')[0] ?? 'en', format: 'json' })}`,
      { signal: abort.signal }
    )
      .then(async response => {
        if (!response.ok) throw Error('search failed')

        const result = await response.json()
        const places = (
          Array.isArray(result.results) ? result.results : []
        ).flatMap(
          (value: {
            name: string
            country?: string
            latitude: number
            longitude: number
          }) => {
            const place = readPlace(
              JSON.stringify({
                name: `${value.name}${value.country ? `, ${value.country}` : ''}`,
                latitude: value.latitude,
                longitude: value.longitude
              })
            )

            return place ? [place] : []
          }
        )

        if (!abort.signal.aborted) {
          setChoices(places)
          if (!places.length) setSearchError(t('weatherNoCity'))
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setSearchError(t('weatherError'))
      })
      .finally(() => {
        if (!abort.signal.aborted) setSearching(false)
      })

    return () => abort.abort()
  }, [query, searchAttempt, i18n.language, t])

  return (
    <Stack gap="md">
      {place && !choosing ? (
        <>
          <Flex align="center" justify="between">
            <Text size="sm" weight="medium">
              {place.name}
            </Text>
            {canConfigure && (
              <Button
                aria-label={t('changeCity')}
                icon="lucide:map-pin"
                namespace={false}
                variant="plain"
                onClick={() => setChoosing(true)}
              />
            )}
          </Flex>
          {error ? (
            <Stack gap="sm">
              <Text color="muted" role="alert">
                {t('weatherError')}
              </Text>
              <Button
                namespace={false}
                variant="plain"
                onClick={() => setRetry(retry + 1)}
              >
                {t('retry')}
              </Button>
            </Stack>
          ) : weather ? (
            <>
              <Flex align="center" gap="lg">
                <Icon
                  icon={
                    weather.code <= 1
                      ? 'lucide:sun'
                      : weather.code <= 3
                        ? 'lucide:cloud-sun'
                        : weather.code >= 71 && weather.code <= 77
                          ? 'lucide:cloud-snow'
                          : 'lucide:cloud-rain'
                  }
                  size="48px"
                />
                <Text className="workspace-weather-temperature">
                  {Math.round(weather.temperature)}°
                </Text>
              </Flex>
              <Text color="muted" size="sm">
                {t('weatherDetails', {
                  wind: Math.round(weather.wind),
                  time: weather.time.split('T')[1] ?? ''
                })}
              </Text>
            </>
          ) : (
            <Text color="muted" role="status">
              {t('loading')}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text color="muted" size="sm">
            {t(canConfigure ? 'weatherSetup' : 'weatherReadOnly')}
          </Text>
          {canConfigure && (
            <>
              <Flex
                as="form"
                gap="sm"
                onSubmit={event => {
                  event.preventDefault()
                  setQuery(city.trim())
                  setSearchAttempt(attempt => attempt + 1)
                }}
              >
                <Box
                  aria-label={t('city')}
                  as="input"
                  className="monolith-inline-input"
                  maxLength={100}
                  placeholder={t('city')}
                  value={city}
                  onChange={event => setCity(event.target.value)}
                />
                <Button
                  aria-label={t('searchCity')}
                  disabled={city.trim().length < 2 || searching}
                  icon="lucide:search"
                  namespace={false}
                  type="submit"
                  variant="secondary"
                />
              </Flex>
              {searching && (
                <Text role="status" size="sm">
                  {t('loading')}
                </Text>
              )}
              {searchError && (
                <Text role="alert" size="sm">
                  {searchError}
                </Text>
              )}
              {choices.map((item, index) => (
                <Button
                  key={`${item.latitude}:${item.longitude}:${index}`}
                  namespace={false}
                  variant="plain"
                  onClick={() => {
                    configuration.onConfigChange?.(JSON.stringify(item))
                    setChoosing(false)
                  }}
                >
                  {item.name}
                </Button>
              ))}
              {place && (
                <Button
                  namespace={false}
                  variant="plain"
                  onClick={() => setChoosing(false)}
                >
                  {t('cancel')}
                </Button>
              )}
            </>
          )}
        </>
      )}
      <Box
        as="a"
        href="https://open-meteo.com/"
        rel="noopener noreferrer"
        target="_blank"
      >
        <Text color="muted" size="xs">
          {t('weatherAttribution')}
        </Text>
      </Box>
    </Stack>
  )
}
