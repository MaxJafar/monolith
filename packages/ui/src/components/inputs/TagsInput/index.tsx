// SPDX-License-Identifier: 0BSD
import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  useId,
  useRef,
  useState
} from 'react'

import { TagChip } from '@/components/display'
import { Flex } from '@/components/primitives'

import { Button } from '../Button'
import { TextInputBox } from '../TextInput/components/TextInputBox'
import { InputIcon } from '../shared/components/InputIcon'
import { InputLabel } from '../shared/components/InputLabel'
import {
  InputWrapper,
  type InputWrapperPassthrough
} from '../shared/components/InputWrapper'
import { useInputLabel } from '../shared/hooks/useInputLabel'
import type { InputVariants } from '../shared/types'
import { appendTags } from './tags'

type TagsInputProps = InputVariants & {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder: string
  label?: string
  icon?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  maxTags?: number
  renderTags?: (tag: string, index: number, remove: () => void) => ReactNode
  className?: string
  namespace?: string | false
  errorMsg?: string
  onEnter?: () => void
  actionButtonProps?: ComponentProps<typeof Button>
  wrapperProps?: InputWrapperPassthrough
}
export function TagsInput({
  value,
  onChange,
  placeholder,
  label,
  icon,
  required,
  disabled,
  autoFocus,
  maxTags = 100,
  renderTags,
  className,
  namespace,
  errorMsg,
  onEnter,
  actionButtonProps,
  wrapperProps,
  variant = 'classic'
}: TagsInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const id = useId()
  const caption = useInputLabel({ label: label ?? '', namespace })
  const active = value.length > 0 || draft.length > 0
  function remove(index: number) {
    if (!disabled) onChange(value.filter((_, i) => i !== index))
  }
  function add(text = draft) {
    if (disabled || composing.current) return
    const next = appendTags(value, text, maxTags)
    if (next.length !== value.length) onChange(next)
    setDraft('')
  }
  return (
    <InputWrapper
      {...wrapperProps}
      className={className}
      variant={variant}
      inputRef={inputRef}
      disabled={disabled}
      errorMsg={errorMsg}
      errorId={id + '-error'}
    >
      {variant === 'classic' && icon && (
        <InputIcon icon={icon} active={active} hasError={!!errorMsg} />
      )}
      <Flex
        direction="column"
        align="start"
        gap="xs"
        flex="1"
        minWidth="0"
        p={variant === 'classic' ? 'sm' : 'xs'}
      >
        {label && (
          <InputLabel
            label={caption}
            htmlFor={id}
            active={active}
            required={required}
            hasError={!!errorMsg}
          />
        )}
        <Flex
          gap="xs"
          wrap="wrap"
          align="center"
          width="100%"
          minWidth="0"
          pt={variant === 'classic' ? 'md' : undefined}
        >
          {value.map((tag, index) => (
            <Fragment key={tag + ':' + index}>
              {renderTags ? (
                renderTags(tag, index, () => remove(index))
              ) : (
                <TagChip
                  label={tag}
                  size="sm"
                  variant="filled"
                  actionButtonProps={
                    disabled
                      ? undefined
                      : { icon: 'tabler:x', onClick: () => remove(index) }
                  }
                />
              )}
            </Fragment>
          ))}
          <TextInputBox
            id={id}
            inputRef={inputRef}
            value={draft}
            onChange={setDraft}
            placeholder={placeholder}
            variant="plain"
            autoFocus={autoFocus}
            disabled={disabled}
            aria-label={caption || placeholder}
            aria-required={required || undefined}
            aria-invalid={!!errorMsg || undefined}
            aria-describedby={errorMsg ? id + '-error' : undefined}
            style={{ padding: '.25rem', flex: '1 1 6rem', minWidth: '6rem' }}
            onBlur={() => add()}
            onCompositionStart={() => {
              composing.current = true
            }}
            onCompositionEnd={() => {
              composing.current = false
            }}
            onPaste={event => {
              const text = event.clipboardData.getData('text')
              if (!composing.current && /[,\n]/.test(text)) {
                event.preventDefault()
                add(draft + text)
              }
            }}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing || composing.current) return
              if (event.key === ',' || event.key === 'Enter') {
                event.preventDefault()
                if (draft.trim()) add()
                else if (event.key === 'Enter') onEnter?.()
              } else if (
                event.key === 'Backspace' &&
                draft === '' &&
                value.length
              ) {
                event.preventDefault()
                remove(value.length - 1)
              }
            }}
          />
        </Flex>
      </Flex>
      {actionButtonProps && (
        <Button
          {...actionButtonProps}
          variant={actionButtonProps.variant ?? 'plain'}
          disabled={disabled || actionButtonProps.disabled}
        />
      )}
    </InputWrapper>
  )
}
