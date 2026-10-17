import {
  type CSSProperties,
  Children,
  type ReactNode,
  type Ref,
  cloneElement,
  isValidElement,
  useMemo
} from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  ref?: Ref<unknown>
  [name: string]: unknown
}

function attach(
  ref: Ref<unknown> | undefined,
  value: unknown
): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(value)
    return typeof cleanup === 'function'
      ? cleanup
      : () => {
          ref(null)
        }
  }
  if (ref) {
    ref.current = value
    return () => {
      ref.current = null
    }
  }
}

export function Slot({ children, ref, ...props }: Props) {
  const child = Children.only(children)
  const childProps = isValidElement<Record<string, unknown>>(child)
    ? child.props
    : {}
  const childRef = childProps.ref as Ref<unknown> | undefined
  const mergedRef = useMemo(() => {
    if (!ref || ref === childRef) return childRef ?? ref
    if (!childRef) return ref
    return (node: unknown) => {
      const cleanups = [attach(childRef, node), attach(ref, node)]
      return () => {
        for (const cleanup of cleanups) cleanup?.()
      }
    }
  }, [ref, childRef])
  if (!isValidElement<Record<string, unknown>>(child)) return null

  const merged: Record<string, unknown> = {
    ...childProps,
    ...props,
    ref: mergedRef
  }
  for (const [name, outer] of Object.entries(props)) {
    const inner = childProps[name]
    if (
      /^on[A-Z]/.test(name) &&
      typeof inner === 'function' &&
      typeof outer === 'function'
    )
      merged[name] = (...args: unknown[]) => {
        inner(...args)
        if (
          !(args[0] as { defaultPrevented?: boolean } | undefined)
            ?.defaultPrevented
        )
          outer(...args)
      }
  }
  merged.className = [childProps.className, props.className]
    .filter(Boolean)
    .join(' ')
  merged.style = { ...(childProps.style as CSSProperties), ...props.style }
  return cloneElement(child, merged)
}
