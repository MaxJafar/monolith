// SPDX-License-Identifier: 0BSD
import { camelCase } from 'lodash'
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'

import { FloatingPopover } from '@/components/overlays/FloatingPopover'
import { Box, Flex, type FlexProps, Icon } from '@/components/primitives'
import useDivSize from '@/hooks/useDivSize'
import { surface } from '@/system'

import { Button } from '../Button'
import { TextInputBox } from '../TextInput/components/TextInputBox'
import { useSearchDraft } from './useSearchDraft'

interface SearchInputProps extends Omit<FlexProps<'search'>, 'onChange'> {
  value: string
  onChange: (query: string) => void
  searchTarget: string
  icon?: string
  disabled?: boolean
  onClear?: () => void
  actionButtonProps?: ComponentProps<typeof Button>
  onKeyUp?: (event: KeyboardEvent<HTMLInputElement>) => void
  namespace?: string | false
  debounceMs?: number
  showChildrenPolicy?:
    'always' | 'input-focus' | 'query-not-empty' | 'input-focus-query-not-empty'
  children?: ReactNode
  onEnter?: () => void
}
export function SearchInput({
  value,
  onChange,
  searchTarget,
  icon = 'tabler:search',
  disabled = false,
  onClear,
  actionButtonProps,
  onKeyUp,
  namespace,
  debounceMs = 0,
  showChildrenPolicy = 'query-not-empty',
  children,
  onEnter,
  ...layout
}: SearchInputProps) {
  const namespaces =
    namespace === false ? [] : [namespace || 'common.misc', 'common.misc']

  const { t, ns } = useModuleTranslation(namespaces)

  const target =
    namespace === false
      ? searchTarget
      : t(
          [
            'items.' + camelCase(searchTarget),
            'items.' + searchTarget,
            searchTarget
          ],
          { defaultValue: searchTarget }
        )
  // t reads only its first namespace, but the shared "Search …" label lives
  // in common.misc, so the label looks through every namespace in order.
  const label =
    namespace === false
      ? 'Search ' + searchTarget
      : t('search', {
          ns: [...(ns ? [ns] : []), ...namespaces],
          item: target,
          defaultValue: 'Search ' + target
        })
  const input = useRef<HTMLInputElement>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const { width } = useDivSize(anchor)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const query = useSearchDraft(value, onChange, debounceMs, disabled)
  const visible =
    !disabled &&
    !dismissed &&
    (showChildrenPolicy === 'always' ||
      (showChildrenPolicy === 'input-focus' && focused) ||
      (showChildrenPolicy === 'query-not-empty' && query.value.length > 0) ||
      (showChildrenPolicy === 'input-focus-query-not-empty' &&
        focused &&
        query.value.length > 0))

  return (
    <Box ref={anchor} width="100%" minWidth="0">
      <Flex
        {...layout}
        as="search"
        align="center"
        gap="sm"
        minWidth="0"
        width="100%"
        p={layout.p ?? 'sm'}
        r={layout.r ?? 'md'}
        bg={layout.bg ?? surface.defaultInteractive}
        onFocus={event => {
          setFocused(true)
          setDismissed(false)
          layout.onFocus?.(event)
        }}
        onBlur={event => {
          if (
            !event.currentTarget.contains(event.relatedTarget) &&
            !results.current?.contains(event.relatedTarget)
          )
            setFocused(false)
          layout.onBlur?.(event)
        }}
      >
        <Icon aria-hidden="true" icon={icon} color="muted" />
        <TextInputBox
          inputRef={input}
          variant="plain"
          value={query.value}
          placeholder={label}
          aria-label={label}
          disabled={disabled}
          type="search"
          autoComplete="off"
          onChange={next => {
            setDismissed(false)
            query.change(next)
          }}
          onEnter={onEnter}
          onKeyUp={onKeyUp}
        />
        {query.value && (
          <Button
            icon="tabler:x"
            aria-label="Clear search"
            variant="plain"
            p="xs"
            disabled={disabled}
            onClick={() => {
              query.change('', true)
              onClear?.()
              input.current?.focus()
            }}
          />
        )}
        {actionButtonProps && (
          <Button
            {...actionButtonProps}
            disabled={disabled || actionButtonProps.disabled}
            variant={actionButtonProps.variant ?? 'plain'}
          />
        )}
      </Flex>
      {children && visible && anchor.current && (
        <FloatingPopover
          anchor={anchor.current}
          label={label}
          width={Math.max(200, width)}
          autoFocus={false}
          onClose={() => setDismissed(true)}
        >
          <Box
            ref={results}
            onFocus={() => setFocused(true)}
            onBlur={event => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                !anchor.current?.contains(event.relatedTarget)
              )
                setFocused(false)
            }}
            onMouseDown={event => {
              if (
                event.target instanceof Element &&
                !event.target.closest(
                  'button, a, input, select, textarea, [tabindex]'
                )
              )
                event.preventDefault()
            }}
          >
            {children}
          </Box>
        </FloatingPopover>
      )}
    </Box>
  )
}
