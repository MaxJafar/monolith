import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

import { useModuleTranslation } from '@lifeforge/localization'
import {
  Button,
  FileField,
  FormModal,
  toast,
  useModalStore
} from '@lifeforge/ui'
import type { FileValue } from '@lifeforge/ui'

import { forgeAPI } from '@/manifest'

import CreateAnotherField, {
  type CreateAnotherValue,
  createAnotherSchema
} from '../components/CreateAnotherFIeld'
import DuplicateTransactionModal from './DuplicateTransactionModal'
import ManagePromptsModal from './ManagePromptsModal'
import ModifyTransactionsModal from './ModifyTransactionsModal'

const schema = z.object({
  receipt: z.any(),
  createAnother: createAnotherSchema
})

function ScanReceiptModal({
  onClose,
  data: { createAnother = 'none' }
}: {
  onClose: () => void
  data: {
    createAnother?: CreateAnotherValue
  }
}) {
  const { open } = useModalStore()
  const { t } = useModuleTranslation()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      receipt: { type: 'empty' } as FileValue,
      createAnother
    }
  })

  useEffect(() => {
    if (!open) {
      form.setValue('receipt', { type: 'empty' })
    }
  }, [open])

  return (
    <FormModal
      form={form}
      submissionConfig={{
        label: 'proceed',
        icon: 'tabler:arrow-right',
        handler: async values => {
          const fileValue = values.receipt

          if (fileValue.type === 'empty' || fileValue.type === 'existing') {
            toast.error(t('toasts.selectFile'))

            return
          }

          const theFile =
            fileValue.type === 'upload'
              ? fileValue.file
              : fileValue.type === 'url'
                ? fileValue.url
                : null

          if (!theFile) {
            toast.error(t('toasts.selectFile'))

            return
          }

          const data = await forgeAPI.transactions.scanReceipt.mutate({
            file: theFile
          })

          onClose()

          const scannedData = {
            ...data,
            receipt: theFile as never
          }

          if (data.matchedTransactionIds.length > 0) {
            open(DuplicateTransactionModal, {
              matchedTransactionIds: data.matchedTransactionIds,
              createAnother: values.createAnother,
              scannedData
            })

            return
          }

          open(ModifyTransactionsModal, {
            type: 'create',
            createAnother: values.createAnother,
            initialData: scannedData
          })
        }
      }}
      uiConfig={{
        icon: 'tabler:scan',
        namespace: 'apps.lifeforge--wallet',
        title: 'receipts.scan',
        headerActions: (
          <Button
            icon="tabler:message"
            variant="plain"
            onClick={() => open(ManagePromptsModal, { onClose: () => {} })}
          />
        ),
        onClose
      }}
    >
      <FileField
        control={form.control}
        icon="tabler:receipt"
        label="receipt"
        mimeTypes={{
          image: ['jpeg', 'png', 'jpg'],
          application: ['pdf']
        }}
        name="receipt"
      />
      <CreateAnotherField control={form.control} />
    </FormModal>
  )
}

export default ScanReceiptModal
