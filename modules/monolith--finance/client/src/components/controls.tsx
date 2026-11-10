import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Button,
  Flex,
  Icon,
  ListboxInput,
  ListboxOption,
  Switch,
  Text,
  TextInput
} from '@monolith/ui'

import { type Dec, normalize, parseInput } from '../../../core/money'

export type Option<T extends string> = {
  value: T
  label: string
  icon?: string
}

/** A labelled listbox for small, fixed choices. */
export function SelectInput<T extends string>({
  label,
  icon = 'tabler:list',
  value,
  options,
  onChange,
  disabled = false
}: {
  label: string
  icon?: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  let empty = '__finance_none__'

  while (options.some(option => option.value === empty)) empty += '_'

  const encode = (raw: string) => (raw === '' ? empty : raw)
  const selected = options.find(
    option => encode(option.value) === encode(value)
  )

  return (
    <ListboxInput<string>
      disabled={disabled}
      icon={selected?.icon ?? icon}
      label={label}
      renderContent={() => <Text>{selected?.label ?? ''}</Text>}
      value={encode(value)}
      onChange={next => {
        const option = options.find(item => encode(item.value) === next)

        if (option) onChange(option.value)
      }}
    >
      {options.map(option => (
        <ListboxOption
          key={option.value}
          icon={option.icon}
          label={option.label}
          value={encode(option.value)}
        />
      ))}
    </ListboxInput>
  )
}

/**
 * A decimal text field. The typed text is kept as written ("1 234,5") and
 * reported as a canonical decimal, or null while it is not a number.
 */
export function AmountInput({
  label,
  value,
  onChange,
  icon = 'tabler:coins',
  required = false,
  autoFocus = false,
  suffix
}: {
  label: string
  value: Dec | null
  onChange: (value: Dec | null) => void
  icon?: string
  required?: boolean
  autoFocus?: boolean
  suffix?: string
}) {
  const { t } = useModuleTranslation()
  const [text, setText] = useState(value ?? '')
  const last = useRef(value)

  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      if ((parseInput(text) ?? null) !== value) setText(value ?? '')
    }
  }, [value, text])

  const parsed = parseInput(text)
  const invalid = text.trim() !== '' && parsed === null

  return (
    <TextInput
      autoFocus={autoFocus}
      errorMsg={invalid ? t('messages.invalidAmount') : undefined}
      icon={icon}
      inputMode="decimal"
      label={label}
      placeholder={suffix ? `0.00 ${suffix}` : '0.00'}
      required={required}
      value={text}
      onChange={next => {
        setText(next)

        const amount = parseInput(next)

        last.current = amount === null ? null : normalize(amount)
        onChange(last.current)
      }}
    />
  )
}

/** A compact single-choice toggle row, e.g. Week · Month · Year. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'default'
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  size?: 'default' | 'small'
}) {
  return (
    <Flex
      aria-label={label}
      className="finance-segmented"
      data-size={size}
      role="radiogroup"
    >
      {options.map(option => (
        <Button
          key={option.value}
          aria-checked={option.value === value}
          icon={option.icon}
          namespace={false}
          role="radio"
          variant="plain"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </Flex>
  )
}

/** A category's icon on a soft disc of its own color. */
export function CategoryIcon({
  icon,
  color,
  size = 36,
  label
}: {
  icon: string
  color?: string
  size?: number
  label?: string
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="finance-glyph"
      role={label ? 'img' : undefined}
      style={
        {
          '--glyph': color || 'var(--fin-neutral)',
          '--glyph-size': `${size}px`
        } as CSSProperties
      }
    >
      <Icon icon={icon || 'tabler:circle-dashed'} />
    </span>
  )
}

/** A labelled switch row, the label clickable as a whole. */
export function SwitchRow({
  label,
  description,
  value,
  onChange,
  children
}: {
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
  children?: ReactNode
}) {
  const { t } = useModuleTranslation()
  const id = useId()
  const help = useId()

  return (
    <Flex
      align="center"
      className="finance-switch-row"
      gap="md"
      justify="between"
    >
      <Flex direction="column" flex="1" gap="xs" minWidth="0">
        <Text id={id} weight="medium">
          {t(label)}
        </Text>
        {description && (
          <Text color="muted" id={help} size="sm">
            {t(description)}
          </Text>
        )}
      </Flex>
      {children}
      <Switch
        aria-describedby={description ? help : undefined}
        aria-labelledby={id}
        value={value}
        onChange={onChange}
      />
    </Flex>
  )
}

/** A rotating spinner line for loading states. */
export function Loading({ label }: { label: string }) {
  return (
    <Flex align="center" gap="md" minHeight="10rem" role="status">
      <Icon aria-hidden="true" icon="svg-spinners:ring-resize" />
      <Text>{label}</Text>
    </Flex>
  )
}
