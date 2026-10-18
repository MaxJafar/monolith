import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

import { LoadingScreen } from '@/components/feedback'
import { Button } from '@/components/inputs'
import { ModalHeader } from '@/components/overlays'
import { Bordered, Flex, Stack } from '@/components/primitives'
import { toast } from '@/providers'

const NamespaceContext = createContext<string | false | undefined>(undefined)

export const useNamespace = () => useContext(NamespaceContext)

const actions = {
  create: { label: 'create', icon: 'tabler:plus' },
  update: { label: 'update', icon: 'tabler:device-floppy' }
} as const

type SubmissionConfig<T extends FieldValues> = {
  disabled?: boolean
  handler: (data: T) => Promise<unknown> | unknown
} & ({ template: keyof typeof actions } | { label: string; icon: string })

export function FormModal<T extends FieldValues>({
  form,
  uiConfig,
  submissionConfig,
  children
}: {
  form: UseFormReturn<T>
  uiConfig: {
    title: string | React.ReactNode
    icon: string
    onClose: () => void
    namespace?: string | false
    loading?: boolean
    headerActions?: React.ReactNode
  }
  submissionConfig: SubmissionConfig<T>
  children: React.ReactNode
}) {
  const titleId = useId()
  const locked = useRef(false)
  const active = useRef(false)
  const [pending, setPending] = useState(false)

  const action =
    'template' in submissionConfig
      ? actions[submissionConfig.template]
      : submissionConfig
  const unavailable = pending || !!uiConfig.loading
  useEffect(() => {
    active.current = true

    return () => {
      active.current = false
    }
  }, [])

  function close() {
    if (!locked.current && !uiConfig.loading) uiConfig.onClose()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (locked.current || uiConfig.loading || submissionConfig.disabled) return
    locked.current = true
    setPending(true)

    try {
      await form.handleSubmit(async values => {
        await submissionConfig.handler(values)
        if (active.current) uiConfig.onClose()
      })()
    } catch (error) {
      if (active.current)
        toast.error(
          error instanceof Error ? error.message : 'Unable to save changes'
        )
    } finally {
      locked.current = false
      if (active.current) setPending(false)
    }
  }

  return (
    <NamespaceContext value={uiConfig.namespace}>
      <Stack
        aria-busy={unavailable}
        aria-labelledby={titleId}
        className="monolith-form-dialog"
        data-dirty={form.formState.isDirty}
        gap="sm"
        maxWidth="100%"
        minWidth="0"
        role="dialog"
        tabIndex={-1}
        width="440px"
      >
        <ModalHeader
          icon={uiConfig.icon}
          namespace={uiConfig.namespace}
          title={uiConfig.title}
          titleId={titleId}
          trailing={uiConfig.headerActions}
          onClose={close}
        />
        {uiConfig.loading ? (
          <Flex centered minHeight="12em">
            <LoadingScreen />
          </Flex>
        ) : (
          <form noValidate onSubmit={submit}>
            <Bordered
              as="fieldset"
              borderSide="none"
              disabled={pending}
              m="none"
              minWidth="0"
              p="none"
            >
              <Stack gap="sm">{children}</Stack>
            </Bordered>
            <Flex
              className="monolith-form-actions"
              gap="sm"
              justify="end"
              mt="md"
              pt="sm"
              wrap="wrap"
            >
              <Button
                disabled={unavailable}
                type="button"
                variant="plain"
                onClick={close}
              >
                cancel
              </Button>
              <Button
                disabled={submissionConfig.disabled}
                icon={action.icon}
                loading={pending}
                type="submit"
              >
                {action.label}
              </Button>
            </Flex>
          </form>
        )}
      </Stack>
    </NamespaceContext>
  )
}
