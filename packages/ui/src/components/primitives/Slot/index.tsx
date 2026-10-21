// SPDX-License-Identifier: 0BSD
import {
  type CSSProperties,
  Children,
  type ReactNode,
  type Ref,
  cloneElement,
  isValidElement,
  useMemo
} from 'react'

interface SlotProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  ref?: Ref<unknown>
  [attribute: string]: unknown
}
function connectRefs(references: Array<Ref<unknown> | undefined>) {
  const unique = [...new Set(references.filter(Boolean))] as NonNullable<
    Ref<unknown>
  >[]
  if (unique.length < 2) return unique[0]
  return (node: unknown) => {
    const release = unique.map(reference => {
      if (typeof reference === 'function') {
        const cleanup = reference(node)
        return typeof cleanup === 'function'
          ? cleanup
          : () => {
              reference(null)
            }
      }
      reference.current = node
      return () => {
        reference.current = null
      }
    })
    return () => {
      for (const cleanup of release) cleanup()
    }
  }
}
function compose(
  inner: Record<string, unknown>,
  outer: Record<string, unknown>
) {
  const output = { ...inner, ...outer }
  for (const key of Object.keys(outer)) {
    const childHandler = inner[key],
      parentHandler = outer[key]
    if (
      /^on[A-Z]/.test(key) &&
      typeof childHandler === 'function' &&
      typeof parentHandler === 'function'
    ) {
      output[key] = (...args: unknown[]) => {
        childHandler(...args)
        const event = args[0] as { defaultPrevented?: boolean } | undefined
        if (!event?.defaultPrevented) return parentHandler(...args)
      }
    }
  }
  output.style = Object.assign({}, inner.style, outer.style)
  output.className = [inner.className, outer.className]
    .filter(Boolean)
    .join(' ')
  return output
}
export function Slot({ children, ref, ...attributes }: SlotProps) {
  const only = Children.only(children)
  const element = isValidElement<Record<string, unknown>>(only) ? only : null
  const ownRef = element?.props.ref as Ref<unknown> | undefined
  const combined = useMemo(() => connectRefs([ownRef, ref]), [ownRef, ref])
  return element
    ? cloneElement(element, {
        ...compose(element.props, attributes),
        ref: combined
      })
    : null
}
