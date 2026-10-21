// SPDX-License-Identifier: 0BSD
import { type RefObject, useEffect, useState } from 'react'

export default function useDivSize(target: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = target.current
    if (!element) return
    const measure = () => {
      const width = element.offsetWidth
      const height = element.offsetHeight
      setSize(previous =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height }
      )
    }
    measure()
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [target])
  return size
}
