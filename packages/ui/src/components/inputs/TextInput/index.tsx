// SPDX-License-Identifier: 0BSD
import {
  type ComponentProps,
  type InputHTMLAttributes,
  type RefObject,
  memo,
  useId,
  useRef,
  useState
} from 'react'

import { usePromiseLoading } from '@monolith/api'

import { Flex } from '@/components/primitives'

import { Button } from '../Button'
import { InputIcon } from '../shared/components/InputIcon'
import { InputLabel } from '../shared/components/InputLabel'
import {
  InputWrapper,
  type InputWrapperPassthrough
} from '../shared/components/InputWrapper'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import type { InputVariants } from '../shared/types'
import { TextInputBox } from './components/TextInputBox'

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'onChange'
> &
  InputVariants<true> & {
    value: string
    onChange: (value: string) => void
    placeholder: string
    label?: string
    icon?: string
    isPassword?: boolean
    namespace?: string | false
    errorMsg?: string
    inputRef?: RefObject<HTMLInputElement | null>
    onEnter?: () => void
    onRawChange?: InputHTMLAttributes<HTMLInputElement>['onChange']
    actionButtonProps?: ComponentProps<typeof Button>
    wrapperProps?: InputWrapperPassthrough
  }

export function _TextInput(props: TextInputProps) {
  const {
    label,
    icon,
    namespace,
    errorMsg,
    wrapperProps,
    className,
    inputRef,
    isPassword,
    actionButtonProps,
    variant = 'classic',
    size = 'default',
    ...input
  } = props
  const generatedId = useId()
  const localRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? localRef
  const [revealed, setRevealed] = useState(false)
  const translatedLabel = useInputLabel({ label: label ?? '', namespace })
  const [busy, runAction] = usePromiseLoading(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      await actionButtonProps?.onClick?.(event)
    }
  )
  const id = input.id ?? generatedId
  const errorId = generatedId + '-error'
  return (
    <InputWrapper
      {...wrapperProps}
      variant={variant}
      size={size}
      className={className}
      disabled={input.disabled}
      inputRef={ref}
      errorMsg={errorMsg}
      errorId={errorId}
    >
      {variant === 'classic' && icon && (
        <InputIcon
          icon={icon}
          active={input.value.length > 0}
          hasError={!!errorMsg}
        />
      )}
      <Flex
        align="center"
        position="relative"
        gap="sm"
        width="100%"
        minWidth="0"
      >
        {variant === 'classic' && label && (
          <InputLabel
            htmlFor={id}
            label={translatedLabel}
            active={input.value.length > 0}
            required={input.required}
            hasError={!!errorMsg}
          />
        )}
        <TextInputBox
          {...input}
          id={id}
          inputRef={ref}
          variant={variant}
          size={size}
          isPassword={isPassword}
          showPassword={revealed}
          aria-label={
            input['aria-label'] ?? (translatedLabel || input.placeholder)
          }
          aria-invalid={input['aria-invalid'] ?? (!!errorMsg || undefined)}
          aria-describedby={
            [input['aria-describedby'], errorMsg ? errorId : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        {isPassword && (
          <Button
            variant="plain"
            icon={revealed ? 'tabler:eye-off' : 'tabler:eye'}
            disabled={input.disabled}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            onClick={() => setRevealed(value => !value)}
            onBlur={() => setRevealed(false)}
          />
        )}
        {actionButtonProps && (
          <Button
            {...actionButtonProps}
            variant={actionButtonProps.variant ?? 'plain'}
            disabled={input.disabled || actionButtonProps.disabled}
            loading={busy || actionButtonProps.loading}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault()
              event.stopPropagation()
              return runAction(event)
            }}
          />
        )}
      </Flex>
    </InputWrapper>
  )
}
export const TextInput = memo(_TextInput)
