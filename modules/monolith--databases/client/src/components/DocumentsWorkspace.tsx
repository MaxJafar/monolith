import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { useSearchParams } from 'react-router'

import { markdownContent } from '@monolith/blocks'
import { useModuleTranslation } from '@monolith/localization'
import {
  BlockEditor,
  Box,
  Button,
  CanonicalSource,
  Card,
  Flex,
  Stack,
  Text,
  TextInput
} from '@monolith/ui'

import { useDatabases } from '@/DatabaseProvider'
import { workspaceAPI } from '@/manifest'
import { DraftNotice, useDraftGuard } from '@/useDraftGuard'

import { PageConnections } from './PageConnections'
import { SelectInput } from './SelectInput'

type Document = {
  id: string
  title: string
  content: string
  parent_id: string | null
  revision: number
  updated: string
}

function DocumentEditor({
  document,
  documents
}: {
  document?: Document
  documents: Document[]
}) {
  const { t } = useModuleTranslation()
  const { run, busy, knowledge, openPage } = useDatabases()
  const [, setParams] = useSearchParams()
  const [saved, setSaved] = useState(document)
  const [title, setTitle] = useState(document?.title ?? '')
  const [content, setContent] = useState(document?.content ?? '')
  const [contentValid, setContentValid] = useState(true)
  const [parent, setParent] = useState(document?.parent_id ?? '')
  const [readOnly, setReadOnly] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty =
    !contentValid ||
    title !== (saved?.title ?? '') ||
    content !== (saved?.content ?? '') ||
    parent !== (saved?.parent_id ?? '')

  const { blocker, allowNavigation } = useDraftGuard(dirty)

  async function save() {
    if (!contentValid) return

    const body = { title, content, parent_id: parent || null }
    const result = await run(() =>
      saved
        ? workspaceAPI.documents.update
            .input({ id: saved.id })
            .mutate({ ...body, expected_revision: saved.revision })
        : workspaceAPI.documents.create.mutate(body)
    )

    if (result) {
      setSaved(result)
      setTitle(result.title)
      setContent(result.content)
      setParent(result.parent_id ?? '')
      if (!saved) allowNavigation()
      if (!saved) setParams({ section: 'documents', document: result.id })
    }
  }

  function exportMarkdown() {
    const url = URL.createObjectURL(
      new Blob([markdownContent(content)], {
        type: 'text/markdown;charset=utf-8'
      })
    )
    const link = window.document.createElement('a')
    link.href = url
    link.download =
      (title || 'document').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 120) +
      '.md'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const descendants = new Set(saved ? [saved.id] : [])

  for (let i = 0; i < documents.length; i++)
    for (const doc of documents)
      if (doc.parent_id && descendants.has(doc.parent_id))
        descendants.add(doc.id)

  return (
    <Stack className="zillion-workspace-enter" gap="lg" minWidth="0">
      <DraftNotice blocker={blocker} />
      <Flex align="center" gap="sm" justify="between" wrap="wrap">
        <Text color="muted" role="status" size="sm">
          {t(dirty ? 'docs.changed' : 'docs.saved')}
          {saved
            ? ` · ${t('docs.revision', { revision: saved.revision })}`
            : ''}
        </Text>
        <Flex gap="sm" wrap="wrap">
          <Button
            aria-pressed={readOnly}
            icon="tabler:eye"
            namespace={false}
            variant="plain"
            onClick={() => setReadOnly(!readOnly)}
          >
            {t(readOnly ? 'docs.edit' : 'docs.preview')}
          </Button>
          <Button
            icon="tabler:download"
            namespace={false}
            variant="secondary"
            onClick={exportMarkdown}
          >
            {t('docs.export')}
          </Button>
          <Button
            disabled={!contentValid || !title.trim() || (!dirty && !!saved)}
            icon="tabler:device-floppy"
            loading={busy}
            namespace={false}
            onClick={() => {
              void save()
            }}
          >
            {t('docs.save')}
          </Button>
        </Flex>
      </Flex>
      <Text as="h2" size={{ base: '2xl', md: '3xl' }} weight="semibold">
        {title || t('docs.untitled')}
      </Text>
      <TextInput
        disabled={readOnly || busy}
        icon="tabler:file-text"
        label={t('docs.title')}
        namespace={false}
        placeholder={t('docs.untitled')}
        value={title}
        onChange={setTitle}
      />
      <SelectInput
        label={t('docs.parent')}
        options={[
          { value: '', label: t('docs.topLevel') },
          ...documents
            .filter(doc => !descendants.has(doc.id))
            .map(doc => ({ value: doc.id, label: doc.title }))
        ]}
        value={parent}
        onChange={setParent}
      />
      <Card>
        <CanonicalSource
          source={saved ? { kind: 'page', id: saved.id } : undefined}
          readOnly={readOnly}
        >
          <BlockEditor
            pages={knowledge.nodes}
            readOnly={readOnly || busy}
            value={content}
            onChange={setContent}
            onOpenPage={openPage}
            onValidityChange={setContentValid}
          />
        </CanonicalSource>
      </Card>
      {saved && <PageConnections pageKey={`document:${saved.id}`} />}
      {saved && (
        <Flex align="center" gap="sm" wrap="wrap">
          <Button
            disabled={busy}
            icon="tabler:refresh"
            namespace={false}
            variant="plain"
            onClick={() => {
              if (dirty && !window.confirm(t('docs.reloadConfirm'))) return
              void run(async () => {
                const latest = (await workspaceAPI.documents.list.query()).find(
                  doc => doc.id === saved.id
                )

                if (!latest) throw new Error(t('docs.unavailable'))
                setSaved(latest)
                setTitle(latest.title)
                setContent(latest.content)
                setParent(latest.parent_id ?? '')

                return true
              })
            }}
          >
            {t('docs.reload')}
          </Button>
          <Button
            dangerous
            disabled={busy}
            icon="tabler:trash"
            namespace={false}
            variant="plain"
            onClick={() => setDeleting(!deleting)}
          >
            {t('docs.delete')}
          </Button>
          {deleting && (
            <>
              <Text>{t('docs.deleteConfirm')}</Text>
              <Button
                dangerous
                loading={busy}
                namespace={false}
                onClick={() => {
                  void run(async () => {
                    await workspaceAPI.documents.remove
                      .input({ id: saved.id })
                      .mutate({ expected_revision: saved.revision })
                    allowNavigation()
                    setParams({ section: 'documents' })

                    return true
                  })
                }}
              >
                {t('docs.confirmDelete')}
              </Button>
            </>
          )}
        </Flex>
      )}
    </Stack>
  )
}

export function DocumentsWorkspace() {
  const query = useQuery(
    workspaceAPI.documents.list.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true
    })
  )

  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)

  const documents = query.data ?? []
  const selected = documents.find(doc => doc.id === params.get('document'))
  const creating = params.get('document') === 'new'
  const visible = documents.filter(doc =>
    doc.title.toLocaleLowerCase().includes(deferred.toLocaleLowerCase())
  )

  function depth(doc: Document) {
    let level = 0,
      cursor = doc.parent_id

    const seen = new Set<string>()

    while (cursor && !seen.has(cursor)) {
      seen.add(cursor)
      level++
      cursor = documents.find(doc => doc.id === cursor)?.parent_id ?? null
    }

    return Math.min(level, 4)
  }

  const ordered = [...visible].sort((a, b) => {
    const path = (doc: Document) => {
      const names = [doc.title]

      let cursor = doc.parent_id

      const seen = new Set<string>()

      while (cursor && !seen.has(cursor)) {
        seen.add(cursor)
        const parent = documents.find(doc => doc.id === cursor)

        if (!parent) break
        names.unshift(parent.title)
        cursor = parent.parent_id
      }

      return names.join('/')
    }

    return path(a).localeCompare(path(b))
  })

  return (
    <Flex
      align="start"
      direction={{ base: 'column', lg: 'row' }}
      gap="xl"
      minWidth="0"
    >
      <Stack flexShrink="0" gap="md" width={{ base: '100%', lg: '18rem' }}>
        <Flex align="center" gap="sm" justify="between">
          <Text weight="semibold">
            {t('docs.library')} · {documents.length}
          </Text>
          <Button
            aria-label={t('docs.create')}
            icon="tabler:plus"
            namespace={false}
            onClick={() => setParams({ section: 'documents', document: 'new' })}
          />
        </Flex>
        <TextInput
          icon="tabler:search"
          label={t('docs.search')}
          namespace={false}
          placeholder={t('docs.search')}
          value={search}
          onChange={setSearch}
        />
        <Stack
          gap="xs"
          maxHeight={{ base: '16rem', lg: '40rem' }}
          overflowY="auto"
        >
          {ordered.map(doc => (
            <Button
              key={doc.id}
              aria-pressed={selected?.id === doc.id}
              icon="tabler:file-text"
              justify="start"
              namespace={false}
              variant={selected?.id === doc.id ? 'secondary' : 'plain'}
              onClick={() =>
                setParams({ section: 'documents', document: doc.id })
              }
            >
              <Text truncate>
                {'› '.repeat(depth(doc))}
                {doc.title}
              </Text>
            </Button>
          ))}
        </Stack>
        {!query.isFetching && !visible.length && (
          <Text color="muted">{t('docs.empty')}</Text>
        )}
      </Stack>
      <Box flex="1" minWidth="0" width="100%">
        {query.isFetching && !documents.length ? (
          <Text role="status">{t('loading')}</Text>
        ) : query.error ? (
          <Stack gap="md">
            <Text role="alert">{query.error.message}</Text>
            <Button
              onClick={() => {
                void query.refetch()
              }}
            >
              retry
            </Button>
          </Stack>
        ) : selected || creating ? (
          <DocumentEditor
            key={selected?.id ?? 'new'}
            document={selected}
            documents={documents}
          />
        ) : (
          <Card>
            <Stack gap="md">
              <Text as="h2" size="2xl" weight="semibold">
                {t('docs.welcome')}
              </Text>
              <Text color="muted">{t('docs.help')}</Text>
              <Button
                icon="tabler:plus"
                namespace={false}
                onClick={() =>
                  setParams({ section: 'documents', document: 'new' })
                }
              >
                {t('docs.create')}
              </Button>
            </Stack>
          </Card>
        )}
      </Box>
    </Flex>
  )
}
