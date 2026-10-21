// SPDX-License-Identifier: 0BSD
import type { Preview } from '@storybook/react-vite'

type Toolbar = NonNullable<
  NonNullable<Preview['globalTypes']>[string]['toolbar']
>

export function toolbar(
  name: string,
  description: string,
  icon: Toolbar['icon'],
  choices: Array<{ value: string | number; title: string }>
) {
  return {
    name,
    description,
    defaultValue: String(choices[0]?.value ?? ''),
    toolbar: {
      icon,
      items: choices.map(choice => ({
        ...choice,
        value: String(choice.value)
      })),
      dynamicTitle: true
    }
  }
}
