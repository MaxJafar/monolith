// SPDX-License-Identifier: 0BSD
import {
  type FormEvent,
  type ReactNode,
  createContext,
  useContext,
  useId,
  useState
} from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useCredentialAction } from '@/components/auth/useCredentialAction'
import { LoadingScreen } from '@/components/feedback'
import { Button } from '@/components/inputs'
import { ModalHeader } from '@/components/overlays'
import { Flex, Stack, Text } from '@/components/primitives'

const FormNamespace = createContext<string | false | undefined>(undefined)
export function useNamespace() {
  return useContext(FormNamespace)
}
type Presentation = {
  title: ReactNode
  icon: string
  onClose: () => void
  namespace?: string | false
  loading?: boolean
  headerActions?: ReactNode
}
type Submission<Values> = {
  disabled?: boolean
  handler: (values: Values) => unknown | Promise<unknown>
} & ({ template: 'create' | 'update' } | { label: string; icon: string })
export function FormModal<Values extends FieldValues>({
  form,
  uiConfig,
  submissionConfig,
  children
}: {
  form: UseFormReturn<Values>
  uiConfig: Presentation
  submissionConfig: Submission<Values>
  children: ReactNode
}) {
  const heading = useId()
  const { t } = useTranslation('common.inputs')
  const task = useCredentialAction()
  const [failure, setFailure] = useState('')
  const busy = task.pending || !!uiConfig.loading
  const action =
    'template' in submissionConfig
      ? {
          label: submissionConfig.template,
          icon:
            submissionConfig.template === 'create'
              ? 'tabler:plus'
              : 'tabler:device-floppy'
        }
      : submissionConfig
  function close() {
    if (!busy) uiConfig.onClose()
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (uiConfig.loading || submissionConfig.disabled) return
    void task.run(async active => {
      setFailure('')
      try {
        await form.handleSubmit(async values => {
          if (!active()) return
          await submissionConfig.handler(values)
          if (active()) uiConfig.onClose()
        })()
      } catch (error) {
        if (active())
          setFailure(
            error instanceof Error && error.message
              ? error.message
              : t('formSaveFailed')
          )
      }
    })
  }
  return (
    <FormNamespace value={uiConfig.namespace}>
      <Stack
        as="section"
        className="monolith-form-dialog"
        role="dialog"
        aria-labelledby={heading}
        aria-busy={busy}
        data-dirty={form.formState.isDirty}
        tabIndex={-1}
        gap="md"
        minWidth="0"
        width="440px"
        maxWidth="100%"
      >
        <form noValidate onSubmit={submit}>
          <ModalHeader
            title={uiConfig.title}
            icon={uiConfig.icon}
            namespace={uiConfig.namespace}
            titleId={heading}
            trailing={uiConfig.headerActions}
            onClose={close}
          />
          {uiConfig.loading ? (
            <LoadingScreen />
          ) : (
            <>
              <Stack
                as="fieldset"
                disabled={task.pending}
                gap="sm"
                minWidth="0"
                style={{ border: 0 }}
                p="none"
                m="none"
              >
                {children}
              </Stack>
              {failure && (
                <Text as="p" role="alert" size="sm" color="dangerous" mt="sm">
                  {failure}
                </Text>
              )}
              <Flex
                as="footer"
                className="monolith-form-actions"
                justify="end"
                wrap="wrap"
                gap="sm"
                mt="md"
                pt="sm"
              >
                <Button
                  variant="plain"
                  type="button"
                  disabled={busy}
                  onClick={close}
                >
                  cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submissionConfig.disabled}
                  loading={task.pending}
                  icon={action.icon}
                >
                  {action.label}
                </Button>
              </Flex>
            </>
          )}
        </form>
      </Stack>
    </FormNamespace>
  )
}
