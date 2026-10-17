import type { EditorSnapshot } from '@monolith/api'
import { type ReactNode, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

import type { InlineDatabaseMode } from '@/components/layout/WorkspaceCanvas/CanvasWidgets'
import { Text } from '@/components/primitives'

const DocumentBody = lazy(() => import('./DocumentBody'))
export {
  CanonicalDocument,
  CanonicalSource,
  type CanonicalIdentity
} from './CanonicalDocument'
export type DocumentEmbed = {
  id: string
  flavour: string
  props: Record<string, unknown>
  updateProps?: (props: Record<string, unknown>) => void
}
export type DocumentEditorProps = {
  workspaceId: string
  initialSnapshot: EditorSnapshot
  readOnly?: boolean
  afterTitle?: ReactNode
  onChange?: (snapshot: EditorSnapshot) => void
  renderEmbed?: (embed: DocumentEmbed) => ReactNode
  chooseDatabase?: (
    insert: (reference: {
      workspaceId: string
      baseId: string
      viewId: string
    }) => void,
    options?: DatabaseChoiceOptions
  ) => void
}
export type DatabaseChoiceOptions = {
  anchor?: HTMLElement
  mode?: InlineDatabaseMode
}

/** Key by source identity. A new initialSnapshot for the same mounted source is
 * deliberately ignored; replacing content requires an explicit recovery action. */
export function DocumentEditor(props: DocumentEditorProps) {
  const { t } = useTranslation('common')
  return (
    <Suspense
      fallback={<Text role="status">{t('documentEditor.loading')}</Text>}
    >
      <DocumentBody
        key={`${props.workspaceId}:${props.initialSnapshot.meta.id}`}
        {...props}
      />
    </Suspense>
  )
}
