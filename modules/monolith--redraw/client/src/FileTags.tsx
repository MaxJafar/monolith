import { useModuleTranslation } from '@monolith/localization'
import { Button, Flex, Stack, Text, TextInput } from '@monolith/ui'
import { useState } from 'react'

import { useEditor } from './EditorProvider'

export function FileTags() {
  const e = useEditor(),
    { t } = useModuleTranslation(),
    [tag, setTag] = useState('')
  const tags = e.document.tags ?? []
  const add = () => {
    const value = tag.trim().replace(/^#/, '')

    if (!value || tags.length >= 30 || e.readOnly) return
    e.updateDocument({ ...e.document, tags: [...new Set([...tags, value])] })
    setTag('')
  }

  return (
    <Stack gap="sm">
      <Text size="sm" weight="semibold">
        {t('tags.title')}
      </Text>
      <Text color="muted" size="sm">
        {t('tags.hint')}
      </Text>
      <Flex gap="xs" wrap="wrap">
        {tags.map(tag => (
          <Button
            key={tag}
            aria-label={t('tags.remove', { tag })}
            disabled={e.readOnly}
            namespace={false}
            variant="secondary"
            onClick={() =>
              e.updateDocument({
                ...e.document,
                tags: tags.filter(t => t !== tag)
              })
            }
          >
            #{tag} ×
          </Button>
        ))}
      </Flex>
      {!e.readOnly && (
        <Flex align="end" gap="xs">
          <TextInput
            label="fileTag"
            maxLength={80}
            placeholder={t('inputs.fileTag.placeholder')}
            value={tag}
            onChange={setTag}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
          />
          <Button
            disabled={!tag.trim() || tags.length >= 30}
            variant="plain"
            onClick={add}
          >
            addTag
          </Button>
        </Flex>
      )}
    </Stack>
  )
}
