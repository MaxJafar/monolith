import { useQuery } from '@tanstack/react-query'
import { memo } from 'react'

import { Stack, Text, surface } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'
import type { IdeaBoxIdea } from '@/providers/IdeaBoxProvider'

function EntryContent({ entry }: { entry: IdeaBoxIdea }) {
  const OGQuery = useQuery(
    forgeAPI.misc.getOgData.input({ id: entry.id }).queryOptions({
      retry: 5
    })
  )

  if (entry.type !== 'link') {
    return null
  }

  return OGQuery.isSuccess && OGQuery.data ? (
    <Stack
      shadow
      as="button"
      bg={surface.lightInteractive}
      p="sm"
      r="md"
      style={{ cursor: 'pointer', textAlign: 'left' }}
      onClick={() => {
        const a = document.createElement('a')

        a.href = entry.link
        a.target = '_blank'
        a.rel = 'noreferrer noopener'
        a.click()
      }}
    >
      {OGQuery.data.ogImage?.[0]?.url && (
        <img
          alt=""
          src={new URL(OGQuery.data.ogImage[0].url, entry.link).href}
          style={{
            border: 0,
            borderRadius: 'var(--radius-md)',
            objectFit: 'contain',
            width: '100%'
          }}
        />
      )}
      <Text color="primary" size="xs" weight="medium">
        {OGQuery.data.ogSiteName ?? new URL(entry.link).hostname}
      </Text>
      {OGQuery.data.ogTitle !== undefined && (
        <Text size="sm" weight="medium">
          {OGQuery.data.ogTitle}
        </Text>
      )}
      {OGQuery.data.ogDescription !== undefined && (
        <Text color="muted" mt="sm" overflowWrap="break-word" size="xs">
          {OGQuery.data.ogDescription}
        </Text>
      )}
    </Stack>
  ) : (
    <Text
      as="a"
      color="primary"
      decoration="underline"
      href={entry.link}
      rel="noreferrer"
      style={{ textUnderlineOffset: '2px' }}
      target="_blank"
      wordBreak="break-all"
    >
      {entry.link}
    </Text>
  )
}

export default memo(EntryContent)
