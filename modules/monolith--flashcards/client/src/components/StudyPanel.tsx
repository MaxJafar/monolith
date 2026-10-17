import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Card,
  Flex,
  ListboxInput,
  ListboxOption,
  Stack,
  Text
} from '@monolith/ui'

import { workspaceAPI } from '@/manifest'

export default function StudyPanel({
  readOnly = false,
  initialDeck = '',
  onDeckChange
}: {
  readOnly?: boolean
  initialDeck?: string
  onDeckChange?: (value: string) => void
}) {
  const { t } = useModuleTranslation()
  const client = useQueryClient()
  const cardsQuery = useQuery(workspaceAPI.cards.list.queryOptions())
  const decksQuery = useQuery(workspaceAPI.decks.list.queryOptions())
  const [deck, setDeck] = useState(initialDeck)
  const [reviewed, setReviewed] = useState<string[]>([])
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cards = (cardsQuery.data || []).filter(
    card => (!deck || card.deck_id === deck) && !reviewed.includes(card.id)
  )
  const card = cards[0]
  const fetchError = [cardsQuery, decksQuery]
    .filter(query => query.isError)
    .map(query => String(query.error))
    .join('; ')

  async function review(remembered: boolean) {
    if (!card || readOnly || busy) return
    setBusy(true)
    setError('')

    try {
      await workspaceAPI.cards.review.input({ id: card.id }).mutate({ remembered })
      setReviewed(previous => [...previous, card.id])
      setRevealed(false)
      await client.invalidateQueries({ queryKey: workspaceAPI.cards.key })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack gap="lg">
      <ListboxInput
        icon="tabler:cards"
        label="inputs.deck_id"
        renderContent={() => (
          <Text>
            {decksQuery.data?.find(item => item.id === deck)?.name || t('none')}
          </Text>
        )}
        value={deck}
        onChange={(value: string) => {
          setDeck(value)
          onDeckChange?.(value)
          setReviewed([])
          setRevealed(false)
        }}
      >
        <ListboxOption label={t('none')} value="" />
        {decksQuery.data?.map(item => (
          <ListboxOption key={item.id} label={item.name} value={item.id} />
        ))}
      </ListboxInput>
      {(cardsQuery.isFetching || decksQuery.isFetching) && (
        <Text role="status">{t('loading')}</Text>
      )}
      {(error || fetchError) && (
        <Text color="dangerous" role="alert">
          {error || fetchError}
        </Text>
      )}
      <Card>
        <Stack gap="lg">
          {card ? (
            <>
              <Text color="muted">
                {reviewed.length + 1} / {reviewed.length + cards.length}
              </Text>
              <Text
                as="h2"
                overflowWrap="anywhere"
                size="2xl"
                whiteSpace="pre-wrap"
              >
                {card.question}
              </Text>
              {revealed ? (
                <>
                  <Text as="p" overflowWrap="anywhere" whiteSpace="pre-wrap">
                    {card.answer}
                  </Text>
                  <Flex gap="sm" wrap="wrap">
                    <Button
                      disabled={busy || readOnly}
                      namespace={false}
                      variant="secondary"
                      onClick={() => review(false)}
                    >
                      {t('again')}
                    </Button>
                    <Button
                      loading={busy}
                      disabled={readOnly}
                      namespace={false}
                      onClick={() => review(true)}
                    >
                      {t('good')}
                    </Button>
                  </Flex>
                </>
              ) : (
                <Button namespace={false} onClick={() => setRevealed(true)}>
                  {t('reveal')}
                </Button>
              )}
            </>
          ) : (
            <Text>{t(cardsQuery.data?.length ? 'finished' : 'empty')}</Text>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
