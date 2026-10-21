// SPDX-License-Identifier: 0BSD
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect
} from 'react'

import { usePersonalization } from '@/providers'

import './print.css'

/** Copy theme variables, never page backgrounds or interaction locks, into a printable subtree. */
export function collectPrintVariables(elements: Element[]) {
  const variables: Record<string, string> = {}
  for (const element of elements) {
    const computed = getComputedStyle(element)
    for (let i = 0; i < computed.length; i++) {
      const name = computed.item(i)
      if (name.startsWith('--'))
        variables[name] = computed.getPropertyValue(name)
    }
  }
  return variables
}

export function PrintArea({
  children,
  contentRef,
  className,
  style
}: {
  children: ReactNode
  contentRef: RefObject<HTMLDivElement | null>
  className?: string
  style?: CSSProperties
}) {
  const {
    derivedTheme,
    bordered,
    bgTemp,
    rootElement,
    borderRadiusMultiplier
  } = usePersonalization()
  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return
    let applied: string[] = []
    const capture = () => {
      const sources = [
        ...new Set(
          [document.documentElement, document.body, rootElement].filter(
            (item): item is HTMLElement => Boolean(item)
          )
        )
      ]
      const variables = collectPrintVariables(sources)
      for (const key of applied)
        if (!(key in variables)) element.style.removeProperty(key)
      for (const [key, value] of Object.entries(variables)) {
        if (!style || !(key in style)) element.style.setProperty(key, value)
      }
      element.style.setProperty(
        '--custom-border-radius-multiplier',
        String(borderRadiusMultiplier)
      )
      applied = Object.keys(variables)
    }
    capture()
    const observer = new MutationObserver(capture)
    for (const source of new Set([
      document.documentElement,
      document.body,
      rootElement
    ])) {
      if (source && source !== element)
        observer.observe(source, {
          attributes: true,
          attributeFilter: ['style', 'class']
        })
    }
    window.addEventListener('beforeprint', capture)
    return () => {
      observer.disconnect()
      window.removeEventListener('beforeprint', capture)
    }
  }, [
    contentRef,
    derivedTheme,
    bordered,
    bgTemp,
    rootElement,
    borderRadiusMultiplier,
    style
  ])
  return (
    <div
      ref={contentRef}
      className={[
        'monolith-statement-print-wrapper',
        derivedTheme === 'dark' ? 'dark' : '',
        bordered ? 'bordered' : '',
        bgTemp,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}
