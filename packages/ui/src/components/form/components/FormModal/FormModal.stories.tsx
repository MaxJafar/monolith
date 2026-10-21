// SPDX-License-Identifier: 0BSD
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormModal } from '.'
import { TextField } from '../fields/TextField'

function ProjectForm() {
  const form = useForm({
    defaultValues: { title: 'Release checklist', notes: '' }
  })
  const [saved, setSaved] = useState('')
  return (
    <>
      <FormModal
        form={form}
        uiConfig={{
          title: 'Project details',
          icon: 'tabler:folder',
          namespace: false,
          onClose: () => {}
        }}
        submissionConfig={{
          template: 'update',
          handler: values => {
            setSaved(values.title)
          }
        }}
      >
        <TextField
          control={form.control}
          name="title"
          label="Title"
          icon="tabler:heading"
          placeholder="Project name"
          required
        />
        <TextField
          control={form.control}
          name="notes"
          label="Notes"
          icon="tabler:notes"
          placeholder="Next steps"
        />
      </FormModal>
      <output>{saved}</output>
    </>
  )
}
const meta = { title: 'Form/FormModal', component: ProjectForm } satisfies Meta<
  typeof ProjectForm
>
export default meta
export const EditProject: StoryObj<typeof meta> = {}
