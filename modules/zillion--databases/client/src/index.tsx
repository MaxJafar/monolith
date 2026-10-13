import { useSearchParams } from 'react-router'

import { useModuleTranslation } from '@lifeforge/localization'
import { Box, Button, Flex, ModuleHeader, Stack, Text } from '@lifeforge/ui'

import { DatabaseProvider, useDatabases } from '@/DatabaseProvider'
import { BaseBrowser } from '@/components/BaseBrowser'
import { BaseNavigation } from '@/components/BaseNavigation'
import { DocumentsWorkspace } from '@/components/DocumentsWorkspace'
import { KnowledgeLibrary } from '@/components/KnowledgeLibrary'
import { KnowledgeWorkspace } from '@/components/KnowledgeWorkspace'
import { RecordEditor } from '@/components/RecordEditor'
import { TypedModuleView } from '@/components/TypedModuleView'
import { WorkspacePagesBrowser } from '@/components/WorkspacePagesBrowser'
import { WorkspaceSettings } from '@/components/WorkspaceSettings'

import './styles.css'

function DatabaseWorkspace() {
  const { loading, error, retry, record, base, closeRecord } = useDatabases()
  const { t } = useModuleTranslation()
  const [params, setParams] = useSearchParams()

  const section = params.get('section') ?? 'databases'
  const type = params.get('type')

  return (
    <>
      <ModuleHeader />
      <Stack gap="lg" mb="lg" minWidth="0">
        <Flex
          aria-label={t('workspace')}
          gap="sm"
          role="navigation"
          wrap="wrap"
        >
          {(['databases', 'documents', 'graph', 'library'] as const).map(
            item => (
              <Button
                key={item}
                aria-pressed={section === item}
                icon={
                  {
                    databases: 'tabler:database',
                    documents: 'tabler:files',
                    graph: 'tabler:circles-relation',
                    library: 'tabler:books'
                  }[item]
                }
                namespace={false}
                variant={section === item ? 'primary' : 'secondary'}
                onClick={() =>
                  setParams({
                    ...Object.fromEntries(
                      params.get('workspace')
                        ? [['workspace', params.get('workspace')!]]
                        : []
                    ),
                    ...(item === 'databases' ? {} : { section: item })
                  })
                }
              >
                {t(`sections.${item}`)}
              </Button>
            )
          )}
        </Flex>
        {error && (
          <Flex
            align="center"
            bg={{ base: 'bg-100', dark: 'bg-900' }}
            gap="md"
            p="md"
            r="lg"
            role="alert"
            wrap="wrap"
          >
            <Text color="dangerous">{error}</Text>
            <Button variant="secondary" onClick={retry}>
              retry
            </Button>
          </Flex>
        )}
        {section === 'workspace' ? (
          <WorkspaceSettings />
        ) : section === 'library' ? (
          <KnowledgeLibrary />
        ) : type && !record ? (
          <TypedModuleView type={type} />
        ) : section === 'documents' ? (
          params.get('workspace') ? (
            <WorkspacePagesBrowser />
          ) : (
            <DocumentsWorkspace />
          )
        ) : section === 'graph' ? (
          <KnowledgeWorkspace />
        ) : loading ? (
          <Box p="xl">
            <Text role="status">{t('loading')}</Text>
          </Box>
        ) : (
          <Flex
            align="start"
            direction={{ base: 'column', lg: 'row' }}
            gap="xl"
            minWidth="0"
          >
            <BaseNavigation />
            <Box flex="1" minWidth="0" width={{ base: '100%', lg: 'auto' }}>
              {record ? (
                <RecordEditor
                  key={record.id}
                  record={record}
                  onDone={closeRecord}
                />
              ) : (
                <BaseBrowser key={base?.id ?? 'empty'} />
              )}
            </Box>
          </Flex>
        )}
      </Stack>
    </>
  )
}

export default function Databases() {
  return (
    <DatabaseProvider>
      <DatabaseWorkspace />
    </DatabaseProvider>
  )
}
