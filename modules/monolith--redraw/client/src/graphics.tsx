import { type ReactNode, useId } from 'react'

import type { Element, Page } from '../../shared'
import { vectorPath } from '../../vector'
import { edgeGeometry, pageBounds } from './model'

export function textLines(
  text: string,
  width: number,
  fontSize: number,
  padding = 12,
  spacing = 0
) {
  const limit = Math.max(
    1,
    Math.floor((width - padding * 2) / Math.max(1, fontSize * 0.59 + spacing))
  )

  return text.split('\n').flatMap(line => {
    const result: string[] = []

    let current = ''

    for (const word of line.split(/\s+/)) {
      if (current && Array.from(current + ' ' + word).length > limit) {
        result.push(current)
        current = ''
      }
      if (Array.from(word).length > limit) {
        const characters = Array.from(word)

        while (characters.length > limit)
          result.push(characters.splice(0, limit).join(''))
        current = characters.join('')
      } else current = current ? current + ' ' + word : word
    }
    if (current || !result.length) result.push(current)

    return result
  })
}

export function ElementGraphic({ element: e }: { element: Element }) {
  const gradientId = useId().replace(/:/g, '')
  const shape = {
    fill: e.gradient ? `url(#${gradientId})` : e.fill,
    fillOpacity: e.fillOpacity ?? 1,
    stroke: e.stroke,
    strokeWidth: e.strokeWidth
  }
  const padding = e.textPadding ?? 12
  const lines = textLines(e.text, e.width, e.fontSize, padding, e.letterSpacing)
  const lineHeight = e.fontSize * (e.lineHeight ?? 1.3)
  const textHeight = lines.length * lineHeight
  const textY =
    e.verticalAlign === 'top'
      ? padding + e.fontSize
      : e.verticalAlign === 'bottom'
        ? e.height - padding - textHeight + e.fontSize
        : Math.max(
            e.fontSize + padding,
            (e.height - textHeight) / 2 + e.fontSize
          )
  const x =
    e.align === 'left'
      ? padding
      : e.align === 'right'
        ? e.width - padding
        : e.width / 2

  return (
    <g
      opacity={e.opacity}
      transform={`translate(${e.x} ${e.y}) rotate(${e.rotation} ${e.width / 2} ${e.height / 2})`}
    >
      {e.gradient && (
        <defs>
          {e.gradient.type === 'linear' ? (
            <linearGradient
              gradientTransform={
                e.gradient.transform
                  ? `matrix(${e.gradient.transform.join(' ')})`
                  : undefined
              }
              id={gradientId}
              x1={e.gradient.start.x}
              x2={e.gradient.end.x}
              y1={e.gradient.start.y}
              y2={e.gradient.end.y}
            >
              {e.gradient.stops.map((stop, i) => (
                <stop
                  key={i}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>
          ) : (
            <radialGradient
              cx={e.gradient.start.x}
              cy={e.gradient.start.y}
              gradientTransform={
                e.gradient.transform
                  ? `matrix(${e.gradient.transform.join(' ')})`
                  : undefined
              }
              id={gradientId}
              r={Math.max(
                0.001,
                Math.hypot(
                  e.gradient.end.x - e.gradient.start.x,
                  e.gradient.end.y - e.gradient.start.y
                )
              )}
            >
              {e.gradient.stops.map((stop, i) => (
                <stop
                  key={i}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </radialGradient>
          )}
        </defs>
      )}
      {e.kind === 'ellipse' ? (
        <ellipse
          {...shape}
          cx={e.width / 2}
          cy={e.height / 2}
          rx={e.width / 2}
          ry={e.height / 2}
        />
      ) : e.kind === 'diamond' ? (
        <polygon
          {...shape}
          points={`${e.width / 2},0 ${e.width},${e.height / 2} ${e.width / 2},${e.height} 0,${e.height / 2}`}
        />
      ) : e.kind === 'path' && (e.pathData || e.vector) ? (
        <svg
          height={e.height}
          overflow="visible"
          preserveAspectRatio="none"
          viewBox={
            e.pathViewBox
              ? `${e.pathViewBox.x} ${e.pathViewBox.y} ${e.pathViewBox.width} ${e.pathViewBox.height}`
              : `0 0 ${e.width} ${e.height}`
          }
          width={e.width}
        >
          <path
            {...shape}
            d={e.vector ? vectorPath(e.vector) : e.pathData}
            fillRule={e.fillRule}
          />
        </svg>
      ) : e.kind === 'path' ? (
        <polyline
          fill="none"
          points={e.points.map(p => `${p.x},${p.y}`).join(' ')}
          stroke={e.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={Math.max(1, e.strokeWidth)}
        />
      ) : e.kind === 'image' ? (
        <image
          height={e.height}
          href={e.image}
          preserveAspectRatio="xMidYMid meet"
          width={e.width}
        />
      ) : (
        e.kind !== 'text' && (
          <rect {...shape} height={e.height} rx={e.radius} width={e.width} />
        )
      )}
      {!!e.image && e.kind !== 'image' && (
        <image
          height={e.height}
          href={e.image}
          preserveAspectRatio="xMidYMid slice"
          width={e.width}
        />
      )}
      {!!e.text && e.kind !== 'frame' && (
        <text
          fill={e.gradient ? `url(#${gradientId})` : e.textColor}
          fontFamily={`${e.fontFamily ?? 'Inter'}, system-ui, sans-serif`}
          fontSize={e.fontSize}
          fontWeight={e.fontWeight}
          letterSpacing={e.letterSpacing}
          textAnchor={
            e.align === 'left'
              ? 'start'
              : e.align === 'right'
                ? 'end'
                : 'middle'
          }
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x} y={textY + i * lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}

export function ClippedGraphic({
  element,
  page,
  children
}: {
  element: Element
  page: Page
  children?: ReactNode
}) {
  const prefix = useId().replace(/:/g, '')
  const ancestors: Element[] = []

  let parent = element.parent

  while (parent && ancestors.length < 32) {
    const frame = page.elements.find(e => e.id === parent)

    if (!frame) break
    ancestors.push(frame)
    parent = frame.parent
  }

  return ancestors
    .filter(e => e.clipContent)
    .reduce<ReactNode>(
      (content, frame) => (
        <g key={frame.id}>
          <defs>
            <clipPath id={`${prefix}-${frame.id}`}>
              <rect
                height={frame.height}
                rx={frame.radius}
                transform={`rotate(${frame.rotation} ${frame.x + frame.width / 2} ${frame.y + frame.height / 2})`}
                width={frame.width}
                x={frame.x}
                y={frame.y}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${prefix}-${frame.id})`}>{content}</g>
        </g>
      ),
      children ?? <ElementGraphic element={element} />
    )
}

export function PageGraphic({
  page,
  markerId = 'redraw-arrow'
}: {
  page: Page
  markerId?: string
}) {
  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerHeight="7"
          markerWidth="7"
          orient="auto-start-reverse"
          refX="9"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      {page.elements
        .filter(e => !e.hidden && e.kind === 'frame')
        .map(e => (
          <ClippedGraphic key={e.id} element={e} page={page} />
        ))}
      {page.connectors.map(edge => {
        const geometry = edgeGeometry(edge, page.elements)

        return (
          geometry && (
            <g key={edge.id}>
              <path
                d={geometry.path}
                fill="none"
                markerEnd={edge.arrow ? `url(#${markerId})` : undefined}
                stroke={edge.color}
                strokeWidth="2"
              />
              {edge.label && (
                <text
                  fill={edge.color}
                  fontSize="16"
                  textAnchor="middle"
                  x={geometry.x}
                  y={geometry.y - 12}
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        )
      })}
      {page.elements
        .filter(e => !e.hidden && e.kind !== 'frame')
        .map(e => (
          <ClippedGraphic key={e.id} element={e} page={page} />
        ))}
    </>
  )
}

export function Preview({ page }: { page: Page }) {
  const b = pageBounds(page.elements.filter(e => !e.hidden))

  return (
    <svg
      aria-label={page.name}
      className="redraw-preview"
      role="img"
      viewBox={`${b.x - 50} ${b.y - 50} ${b.width + 100} ${b.height + 100}`}
    >
      <PageGraphic markerId={`preview-${page.id}`} page={page} />
    </svg>
  )
}
