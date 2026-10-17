import { useAPIEndpoint, useAuth } from '@monolith/api'
import { useModuleTranslation } from '@monolith/localization'
import {
  Bordered,
  Box,
  Button,
  Flex,
  Grid,
  Icon,
  Stack,
  Text,
  TextInput,
  surface
} from '@monolith/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { Mode, ProjectSummary } from '../../shared'
import { workspaceAPI } from '../manifest'
import { readDocument } from './exports'
import { Preview } from './graphics'
import { duplicateDocument } from './model'
import type { ImportResult } from './nativeImport'
import { readNativeFile } from './readNativeFile'
import { type Template, createTemplate, templates } from './templates'

export type Workspace = { id: string; name: string; role: string }

function TemplateCard({
  template,
  disabled,
  create
}: {
  template: (typeof templates)[number]
  disabled: boolean
  create: () => void
}) {
  const { t } = useModuleTranslation()

  const example = useMemo(
    () => createTemplate(template.id, template.mode, t),
    [template.id, template.mode, t]
  )

  return (
    <Bordered
      asChild
      borderColor={{ base: 'bg-200', dark: 'bg-800' }}
      overflow="hidden"
      r="lg"
    >
      <Stack bg={surface.default} gap="none">
        <Box bg="bg-100" height="9rem" overflow="hidden">
          <Preview page={example.pages[0]!} />
        </Box>
        <Button
          disabled={disabled}
          icon={template.icon}
          justify="between"
          namespace={false}
          variant="plain"
          onClick={create}
        >
          <Text size="sm" weight="medium">
            {t(`templates.${template.id}`)}
          </Text>
          <Icon icon="lucide:arrow-up-right" />
        </Button>
      </Stack>
    </Bordered>
  )
}

export function Dashboard({
  workspace,
  open
}: {
  workspace: Workspace
  open: (id: string) => void
}) {
  const { t } = useModuleTranslation(),
    { userData } = useAuth(),
    endpoint = useAPIEndpoint(),
    client = useQueryClient()
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState<'all' | Mode | 'starred'>('all'),
    [archived, setArchived] = useState(false)
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null),
    alive = useRef(true)

  const importer = useRef<AbortController | null>(null)
  const [review, setReview] = useState<ImportResult | null>(null)

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
      importer.current?.abort()
    }
  }, [])

  const options = workspaceAPI.projects.list
    .input({
      workspace_id: workspace.id,
      archived: archived ? 'true' : 'false'
    })
    .queryOptions()

  const query = useQuery({
    ...options,
    queryKey: [...options.queryKey, endpoint, userData?.id]
  })

  const projects: ProjectSummary[] = query.data ?? []
  const visible = projects.filter(
    project =>
      `${project.title} ${(project.tags ?? []).map(tag => `#${tag}`).join(' ')}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (filter === 'all' || filter === 'starred'
        ? filter !== 'starred' || project.starred
        : project.modes.includes(filter))
  )
  const readOnly = workspace.role === 'viewer'

  async function run(action: () => Promise<void>) {
    if (pending || readOnly) return
    setPending(true)
    setError(null)

    try {
      await action()
      void client.invalidateQueries({ queryKey: workspaceAPI.projects.list.key })
    } catch (caught) {
      if (alive.current)
        setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (alive.current) setPending(false)
    }
  }

  function create(mode: Mode, template: Template = 'blank') {
    void run(async () => {
      const title =
        template === 'blank'
          ? t('dashboard.untitled', { mode: t(`modes.${mode}`) })
          : t(`templates.${template}`)
      const project = await workspaceAPI.projects.create
        .input({ workspace_id: workspace.id })
        .mutate({ title, document: createTemplate(template, mode, t) })

      if (alive.current) open(project.id)
    })
  }

  function update(
    project: ProjectSummary,
    change: { archived?: boolean; starred?: boolean }
  ) {
    void run(async () => {
      await workspaceAPI.projects.update
        .input({ workspace_id: workspace.id })
        .mutate({
          id: project.id,
          expected_revision: project.revision,
          ...change
        })
    })
  }

  return (
    <Stack
      className="redraw"
      gap="xl"
      maxWidth="100%"
      p={{ base: 'md', lg: 'xl' }}
    >
      <Flex align="center" gap="md" justify="between" wrap="wrap">
        <Flex align="center" gap="md">
          <Box bg={surface.light} p="md" r="lg">
            <Icon color="primary" icon="lucide:pen-tool" size="2rem" />
          </Box>
          <Stack gap="xs">
            <Text as="h1" size="3xl" weight="semibold">
              Redraw
            </Text>
            <Text color="muted">{t('description')}</Text>
          </Stack>
        </Flex>
        <Flex align="center" gap="sm">
          <Text color="muted" size="sm">
            {workspace.name}
          </Text>
          <Button
            disabled={readOnly || pending}
            icon="lucide:upload"
            variant="secondary"
            onClick={() => file.current?.click()}
          >
            importProject
          </Button>
        </Flex>
        <input
          ref={file}
          hidden
          accept=".json,.redraw.json,.penpot,.fig,application/json"
          type="file"
          onChange={event => {
            const selected = event.target.files?.[0]
            event.target.value = ''
            if (selected)
              void run(async () => {
                if (/\.(penpot|fig)$/i.test(selected.name)) {
                  importer.current?.abort()
                  importer.current = new AbortController()
                  const result = await readNativeFile(
                    selected,
                    importer.current.signal
                  )

                  if (alive.current) setReview(result)

                  return
                }

                const document = await readDocument(selected)
                const title =
                  selected.name
                    .replace(/(?:\.redraw)?\.json$/i, '')
                    .slice(0, 160) || t('dashboard.imported')
                const project = await workspaceAPI.projects.create
                  .input({ workspace_id: workspace.id })
                  .mutate({ title, document: duplicateDocument(document) })

                if (alive.current) open(project.id)
              })
          }}
        />
      </Flex>
      {review && (
        <Stack
          aria-label={t('imports.review')}
          bg={surface.light}
          gap="md"
          p="md"
          r="lg"
          role="region"
        >
          <Text as="h2" size="xl" weight="semibold">
            {t('imports.review')}: {review.title}
          </Text>
          <Text>
            {t('imports.summary', {
              pages: review.document.pages.length,
              shapes: review.document.pages.reduce(
                (sum, page) => sum + page.elements.length,
                0
              ),
              components: review.document.components?.length ?? 0
            })}
          </Text>
          <Grid gap="sm" templateCols={{ base: 1, md: 3 }}>
            {review.document.pages.map(page => (
              <Stack key={page.id} gap="xs">
                <Box bg={surface.default} height="8rem" r="md">
                  <Preview page={page} />
                </Box>
                <Text size="sm">{page.name}</Text>
              </Stack>
            ))}
          </Grid>
          {!!review.warnings.length && (
            <Stack gap="xs" role="status">
              <Text weight="semibold">{t('imports.changed')}</Text>
              {review.warnings.map(warning => (
                <Text key={warning.code} size="sm">
                  {t(`importWarnings.${warning.code}`, {
                    count: warning.count
                  })}
                </Text>
              ))}
            </Stack>
          )}
          <Flex gap="sm">
            <Button
              disabled={readOnly}
              loading={pending}
              onClick={() => {
                void run(async () => {
                  const project = await workspaceAPI.projects.create
                    .input({ workspace_id: workspace.id })
                    .mutate({
                      title: review.title,
                      document: duplicateDocument(review.document)
                    })

                  if (alive.current) open(project.id)
                })
              }}
            >
              confirmImport
            </Button>
            <Button
              disabled={pending}
              variant="plain"
              onClick={() => setReview(null)}
            >
              cancelImport
            </Button>
          </Flex>
        </Stack>
      )}
      {error && (
        <Flex align="center" gap="sm" role="alert" wrap="wrap">
          <Text color="dangerous">
            {t(`errors.${error}`, { defaultValue: error })}
          </Text>
          <Button variant="plain" onClick={() => setError(null)}>
            dismiss
          </Button>
        </Flex>
      )}
      <Grid gap="md" templateCols={{ base: 1, lg: 2 }}>
        {(['blackboard', 'canvas'] as const).map(mode => (
          <Bordered
            key={mode}
            asChild
            borderColor={{ base: 'bg-200', dark: 'bg-800' }}
            r="lg"
          >
            <Flex
              align="center"
              bg={surface.default}
              gap="lg"
              justify="between"
              p="lg"
            >
              <Stack gap="sm">
                <Flex align="center" gap="sm">
                  <Icon
                    color="primary"
                    icon={
                      mode === 'blackboard'
                        ? 'lucide:network'
                        : 'lucide:pen-tool'
                    }
                  />
                  <Text size="xl" weight="semibold">
                    {t(`modes.${mode}`)}
                  </Text>
                </Flex>
                <Text color="muted" size="sm">
                  {t(`dashboard.${mode}Description`)}
                </Text>
                <Button
                  disabled={readOnly || pending}
                  icon="lucide:plus"
                  variant="secondary"
                  width="fit-content"
                  onClick={() => create(mode)}
                >
                  {mode === 'blackboard' ? 'newBlackboard' : 'newCanvas'}
                </Button>
              </Stack>
              <Box
                display={{ base: 'none', sm: 'block' }}
                flexShrink="0"
                width="8rem"
              >
                <svg
                  aria-hidden="true"
                  className="redraw-mode-art"
                  viewBox="0 0 160 130"
                >
                  {mode === 'blackboard' ? (
                    <>
                      <path
                        d="M40 65C80 65 60 25 105 25M40 65C80 65 60 105 105 105"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="3"
                      />
                      <rect
                        fill="#c4b5fd"
                        height="42"
                        rx="10"
                        width="66"
                        x="0"
                        y="44"
                      />
                      <rect
                        fill="#93c5fd"
                        height="36"
                        rx="8"
                        width="60"
                        x="100"
                        y="7"
                      />
                      <rect
                        fill="#fda4af"
                        height="36"
                        rx="8"
                        width="60"
                        x="100"
                        y="87"
                      />
                    </>
                  ) : (
                    <>
                      <rect
                        fill="#ede9fe"
                        height="120"
                        rx="8"
                        width="130"
                        x="15"
                        y="5"
                      />
                      <rect
                        fill="#8b5cf6"
                        height="8"
                        rx="4"
                        width="54"
                        x="30"
                        y="22"
                      />
                      <rect
                        fill="#c4b5fd"
                        height="5"
                        rx="2"
                        width="90"
                        x="30"
                        y="42"
                      />
                      <circle cx="62" cy="83" fill="#a78bfa" r="23" />
                      <rect
                        fill="#fda4af"
                        height="35"
                        rx="4"
                        transform="rotate(-12 105 87)"
                        width="35"
                        x="88"
                        y="69"
                      />
                    </>
                  )}
                </svg>
              </Box>
            </Flex>
          </Bordered>
        ))}
      </Grid>
      <Stack gap="md">
        <Flex align="center" justify="between">
          <Text as="h2" size="lg" weight="semibold">
            {t('dashboard.startWith')}
          </Text>
          <Text color="muted" size="sm">
            {t('dashboard.templateHint')}
          </Text>
        </Flex>
        <Grid gap="md" templateCols={{ base: 1, sm: 2, xl: 4 }}>
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              create={() => create(template.mode, template.id)}
              disabled={readOnly || pending}
              template={template}
            />
          ))}
        </Grid>
      </Stack>
      <Stack gap="md">
        <Flex align="center" gap="md" justify="between" wrap="wrap">
          <Text as="h2" size="lg" weight="semibold">
            {t(archived ? 'dashboard.archive' : 'dashboard.projects')}{' '}
            <Text color="muted" size="sm">
              {projects.length}
            </Text>
          </Text>
          <Flex align="center" gap="sm">
            <Box maxWidth="100%" width="16rem">
              <TextInput
                icon="lucide:search"
                label="search"
                placeholder={t('inputs.search.placeholder')}
                value={search}
                variant="plain"
                onChange={setSearch}
              />
            </Box>
            <Button
              aria-pressed={archived}
              icon="lucide:archive"
              variant={archived ? 'secondary' : 'plain'}
              onClick={() => setArchived(!archived)}
            >
              archive
            </Button>
          </Flex>
        </Flex>
        <Flex gap="xs" wrap="wrap">
          {(['all', 'blackboard', 'canvas', 'starred'] as const).map(value => (
            <Button
              key={value}
              aria-pressed={filter === value}
              variant={filter === value ? 'secondary' : 'plain'}
              onClick={() => setFilter(value)}
            >
              {value}
            </Button>
          ))}
        </Flex>
        {query.isPending ? (
          <Text color="muted" role="status">
            {t('loading')}
          </Text>
        ) : query.error ? (
          <Flex align="center" gap="md" role="alert">
            <Text color="dangerous">{t('errors.loadFailed')}</Text>
            <Button
              variant="secondary"
              onClick={() => {
                void query.refetch()
              }}
            >
              retry
            </Button>
          </Flex>
        ) : !visible.length ? (
          <Bordered
            borderColor={{ base: 'bg-300', dark: 'bg-700' }}
            borderStyle="dashed"
            p="xl"
            r="lg"
          >
            <Stack align="center" gap="sm">
              <Icon color="muted" icon="lucide:layers" size="2rem" />
              <Text weight="medium">
                {t(projects.length ? 'dashboard.noResults' : 'dashboard.empty')}
              </Text>
              <Text color="muted" size="sm">
                {t(
                  projects.length
                    ? 'dashboard.changeSearch'
                    : 'dashboard.emptyHint'
                )}
              </Text>
              {(search || filter !== 'all') && (
                <Button
                  variant="plain"
                  onClick={() => {
                    setSearch('')
                    setFilter('all')
                  }}
                >
                  clearFilters
                </Button>
              )}
            </Stack>
          </Bordered>
        ) : (
          <Grid gap="md" templateCols={{ base: 1, md: 2, xl: 3 }}>
            {visible.map(project => (
              <Bordered
                key={project.id}
                asChild
                borderColor={{ base: 'bg-200', dark: 'bg-800' }}
                r="lg"
              >
                <Stack bg={surface.default} gap="none">
                  <Button
                    align="start"
                    direction="column"
                    gap="md"
                    namespace={false}
                    p="lg"
                    variant="plain"
                    onClick={() => open(project.id)}
                  >
                    <Flex align="center" gap="sm">
                      <Icon
                        color="primary"
                        icon={
                          project.modes.includes('canvas')
                            ? 'lucide:pen-tool'
                            : 'lucide:network'
                        }
                        size="1.5rem"
                      />
                      <Text overflowWrap="anywhere" weight="semibold">
                        {project.title}
                      </Text>
                    </Flex>
                    <Text color="muted" size="sm">
                      {project.modes
                        .map(mode => t(`modes.${mode}`))
                        .join(' · ')}{' '}
                      · {t('dashboard.objects', { count: project.objects })}
                    </Text>
                    {!!project.tags?.length && (
                      <Text color="muted" size="sm">
                        {project.tags.map(tag => `#${tag}`).join(' ')}
                      </Text>
                    )}
                  </Button>
                  <Flex
                    align="center"
                    gap="xs"
                    justify="between"
                    pb="sm"
                    px="md"
                  >
                    <Text color="muted" size="sm">
                      {dayjs(project.updated).format('MMM D, HH:mm')}
                    </Text>
                    <Flex gap="xs">
                      <Button
                        aria-label={t(
                          project.starred
                            ? 'dashboard.unstar'
                            : 'dashboard.star',
                          { name: project.title }
                        )}
                        aria-pressed={project.starred}
                        disabled={readOnly || pending}
                        icon="lucide:star"
                        variant="plain"
                        onClick={() =>
                          update(project, { starred: !project.starred })
                        }
                      />
                      <Button
                        aria-label={t('dashboard.duplicate', {
                          name: project.title
                        })}
                        disabled={readOnly || pending}
                        icon="lucide:copy"
                        variant="plain"
                        onClick={() => {
                          void run(async () => {
                            const original = await workspaceAPI.projects.get
                              .input({
                                workspace_id: workspace.id,
                                id: project.id
                              })
                              .query()
                            const copy = await workspaceAPI.projects.create
                              .input({ workspace_id: workspace.id })
                              .mutate({
                                title: `${project.title.slice(0, 140)} ${t('dashboard.copy')}`,
                                document: duplicateDocument(original.document)
                              })

                            if (alive.current) open(copy.id)
                          })
                        }}
                      />
                      <Button
                        aria-label={t(
                          archived
                            ? 'dashboard.restore'
                            : 'dashboard.archiveProject',
                          { name: project.title }
                        )}
                        disabled={readOnly || pending}
                        icon={
                          archived ? 'lucide:archive-restore' : 'lucide:archive'
                        }
                        variant="plain"
                        onClick={() => update(project, { archived: !archived })}
                      />
                    </Flex>
                  </Flex>
                </Stack>
              </Bordered>
            ))}
          </Grid>
        )}
      </Stack>
    </Stack>
  )
}
