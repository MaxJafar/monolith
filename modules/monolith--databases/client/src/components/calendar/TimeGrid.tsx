import dayjs from 'dayjs'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState
} from 'react'

import { useModuleTranslation } from '@monolith/localization'
import {
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  getInternalDragData,
  hasInternalDragData,
  setInternalDragData
} from '@monolith/ui'

import type { CalendarOccurrence } from '../../../../calendarShared'
import './calendar.css'
import {
  CALENDAR_OCCURRENCE_DRAG,
  HOUR_HEIGHT,
  daySegments,
  gestureTimes,
  moveToDate,
  occursOnDay,
  snapMinutes
} from './timeGridModel'

type Gesture = {
  item: CalendarOccurrence
  mode: 'move' | 'resize'
  x: number
  y: number
  scroll: number
  day: number
  moved: boolean
  element: HTMLElement
  pointer: number
}

export function TimeGrid({
  days,
  items,
  disabled,
  onOpen,
  onChange,
  onCreate,
  eventStyle
}: {
  days: string[]
  items: CalendarOccurrence[]
  disabled: boolean
  onOpen: (item: CalendarOccurrence, element: HTMLElement) => void
  onChange: (
    item: CalendarOccurrence,
    start: string,
    end: string
  ) => Promise<void>
  eventStyle?: (item: CalendarOccurrence) => CSSProperties | undefined
  onCreate: (start: string, end: string, anchor: HTMLElement) => void
}) {
  const { t, i18n } = useModuleTranslation()

  const scroll = useRef<HTMLDivElement>(null),
    grid = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null),
    lastPointer = useRef({ x: 0, y: 0 })

  const suppressClick = useRef(false)

  const [preview, setPreview] = useState<{
    id: string
    start: string
    end: string
  } | null>(null)

  const [now, setNow] = useState(dayjs())
  const previewRef = useRef(preview)

  const displayed = preview
    ? items.map(item =>
        item.id === preview.id ? { ...item, ...preview } : item
      )
    : items

  function cancel() {
    gesture.current = null
    previewRef.current = null
    setPreview(null)
  }
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 7 * HOUR_HEIGHT

    const timer = setInterval(() => setNow(dayjs()), 60000)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault()
        suppressClick.current = true
        cancel()
      }
    }
    document.addEventListener('keydown', escape)
    window.addEventListener('blur', cancel)

    return () => {
      clearInterval(timer)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('blur', cancel)
      gesture.current = null
    }
  }, [])
  useEffect(() => {
    if (disabled) cancel()
  }, [disabled])

  function update(x: number, y: number) {
    const current = gesture.current,
      rect = grid.current?.getBoundingClientRect()

    if (!current || !rect || disabled) return
    if (Math.abs(x - current.x) + Math.abs(y - current.y) > 4)
      current.moved = true
    if (!current.moved) return

    const delta = snapMinutes(
      y - current.y + (scroll.current?.scrollTop ?? 0) - current.scroll
    )
    const target = Math.max(
      0,
      Math.min(
        days.length - 1,
        Math.floor((x - rect.left) / (rect.width / days.length))
      )
    )
    const next = {
      id: current.item.id,
      ...gestureTimes(current.item, current.mode, delta, target - current.day)
    }
    previewRef.current = next
    setPreview(next)
  }
  useEffect(() => {
    if (!preview) return
    let frame = 0

    function tick() {
      const scroller = scroll.current,
        current = gesture.current

      if (!current || !scroller) return

      const rect = scroller.getBoundingClientRect(),
        y = lastPointer.current.y
      const velocity = y < rect.top + 64 ? -10 : y > rect.bottom - 48 ? 10 : 0

      if (velocity) {
        scroller.scrollTop += velocity
        update(lastPointer.current.x, y)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [!!preview])

  function begin(
    event: ReactPointerEvent<HTMLElement>,
    item: CalendarOccurrence,
    mode: 'move' | 'resize',
    day: number
  ) {
    if (disabled || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.current = false
    lastPointer.current = { x: event.clientX, y: event.clientY }
    gesture.current = {
      item,
      mode,
      x: event.clientX,
      y: event.clientY,
      scroll: scroll.current?.scrollTop ?? 0,
      day,
      moved: false,
      element: event.currentTarget,
      pointer: event.pointerId
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function end(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current,
      next = previewRef.current

    if (!current) return
    suppressClick.current = current.moved
    cancel()
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (
      current.moved &&
      next &&
      !disabled &&
      (next.start !== current.item.start || next.end !== current.item.end)
    )
      void onChange(current.item, next.start, next.end)
  }

  function keyboard(
    event: React.KeyboardEvent,
    item: CalendarOccurrence,
    resize: boolean
  ) {
    if (
      disabled ||
      (!resize && !event.altKey) ||
      !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    )
      return
    event.preventDefault()
    event.stopPropagation()
    const minutes =
      event.key === 'ArrowUp' ? -15 : event.key === 'ArrowDown' ? 15 : 0
    const days =
      event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    const next = gestureTimes(item, resize ? 'resize' : 'move', minutes, days)
    void onChange(item, next.start, next.end)
  }

  return (
    <Stack className="monolith-time-calendar" gap="none">
      <Text color="muted" size="sm">
        {t('scheduling.gestureHelp')}
      </Text>
      <Box
        ref={scroll}
        className="monolith-time-scroll"
        maxHeight="min(72vh, 900px)"
        overflow="auto"
      >
        <Box minWidth={days.length > 1 ? '720px' : '300px'}>
          <Grid
            className="monolith-time-head"
            position="sticky"
            templateCols={`60px repeat(${days.length}, minmax(0, 1fr))`}
            top="0"
            zIndex="3"
          >
            <Text color="muted" p="xs" size="sm">
              {Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone.split('/')
                .pop()}
            </Text>
            {days.map(date => (
              <Stack
                key={date}
                className="monolith-time-heading"
                data-today={date === now.format('YYYY-MM-DD')}
                gap="xs"
                p="sm"
              >
                <Text color="muted" size="sm">
                  {dayjs(date).locale(i18n.language).format('ddd')}
                </Text>
                <Text size="xl" weight="semibold">
                  {dayjs(date).format('D')}
                </Text>
              </Stack>
            ))}
            <Text color="muted" p="xs" size="sm">
              {t('scheduling.allDay')}
            </Text>
            {days.map(date => (
              <Stack
                key={date}
                className="monolith-time-allday"
                gap="xs"
                p="xs"
                onDragOver={event => {
                  if (
                    !disabled &&
                    hasInternalDragData(
                      event.nativeEvent,
                      CALENDAR_OCCURRENCE_DRAG
                    )
                  )
                    event.preventDefault()
                }}
                onDrop={event => {
                  event.preventDefault()
                  if (disabled) return

                  const item = items.find(
                    item =>
                      item.id ===
                      getInternalDragData(
                        event.nativeEvent,
                        CALENDAR_OCCURRENCE_DRAG
                      )
                  )

                  if (item) {
                    const next = moveToDate(item, date)
                    void onChange(item, next.start, next.end)
                  }
                }}
              >
                {items
                  .filter(item => item.allDay && occursOnDay(item, date))
                  .map(item => (
                    <Button
                      key={item.id}
                      draggable={!disabled}
                      justify="start"
                      namespace={false}
                      style={eventStyle?.(item)}
                      variant="secondary"
                      onClick={event => onOpen(item, event.currentTarget)}
                      onDragStart={event =>
                        setInternalDragData(
                          event.nativeEvent,
                          CALENDAR_OCCURRENCE_DRAG,
                          item.id
                        )
                      }
                    >
                      {item.record.title}
                    </Button>
                  ))}
              </Stack>
            ))}
          </Grid>
          <Flex align="stretch" gap="none">
            <Box
              flexShrink="0"
              height={`${24 * HOUR_HEIGHT}px`}
              position="relative"
              width="60px"
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <Box
                  key={hour}
                  position="absolute"
                  right="8px"
                  top={`${hour * HOUR_HEIGHT}px`}
                >
                  <Text color="muted" size="sm">
                    {String(hour).padStart(2, '0')}:00
                  </Text>
                </Box>
              ))}
            </Box>
            <Grid
              ref={grid}
              flex="1"
              gap="none"
              height={`${24 * HOUR_HEIGHT}px`}
              templateCols={days.length}
            >
              {days.map((date, day) => (
                <Box
                  key={date}
                  className="monolith-time-day"
                  data-date={date}
                  position="relative"
                >
                  {Array.from({ length: 48 }, (_, slot) => (
                    <Box
                      key={slot}
                      aria-label={t('scheduling.createAt', {
                        date,
                        time: `${Math.floor(slot / 2)}:${slot % 2 ? '30' : '00'}`
                      })}
                      as="button"
                      className="monolith-time-slot"
                      disabled={disabled}
                      height={`${HOUR_HEIGHT / 2}px`}
                      position="absolute"
                      tabIndex={slot === 18 ? 0 : -1}
                      top={`${(slot * HOUR_HEIGHT) / 2}px`}
                      width="100%"
                      onClick={event =>
                        onCreate(
                          dayjs(date)
                            .hour(Math.floor(slot / 2))
                            .minute((slot % 2) * 30)
                            .toISOString(),
                          dayjs(date)
                            .hour(Math.floor(slot / 2) + 1)
                            .minute((slot % 2) * 30)
                            .toISOString(),
                          event.currentTarget
                        )
                      }
                    />
                  ))}
                  {date === now.format('YYYY-MM-DD') && (
                    <Box
                      className="monolith-time-now"
                      position="absolute"
                      top={`${(now.hour() + now.minute() / 60) * HOUR_HEIGHT}px`}
                      width="100%"
                    />
                  )}
                  {daySegments(displayed, date).map(
                    ({ item, top, bottom, column, columns, canResize }) => (
                      <Stack
                        key={item.id}
                        className="monolith-time-event"
                        data-done={item.done}
                        data-moving={preview?.id === item.id}
                        gap="none"
                        height={`${Math.max(24, ((bottom - top) / 60) * HOUR_HEIGHT - 2)}px`}
                        left={`calc(${(column / columns) * 100}% + 2px)`}
                        position="absolute"
                        style={eventStyle?.(item)}
                        top={`${(top / 60) * HOUR_HEIGHT}px`}
                        width={`calc(${100 / columns}% - 4px)`}
                      >
                        <Box
                          aria-label={`${item.record.title}, ${dayjs(item.start).format('HH:mm')} – ${dayjs(item.end).format('HH:mm')}`}
                          as="button"
                          className="monolith-time-event-body"
                          height="100%"
                          px="xs"
                          width="100%"
                          onClick={event => {
                            if (!suppressClick.current)
                              onOpen(item, event.currentTarget)
                            suppressClick.current = false
                          }}
                          onKeyDown={event => keyboard(event, item, false)}
                          onLostPointerCapture={cancel}
                          onPointerCancel={cancel}
                          onPointerDown={event =>
                            begin(event, item, 'move', day)
                          }
                          onPointerMove={event => {
                            lastPointer.current = {
                              x: event.clientX,
                              y: event.clientY
                            }
                            update(event.clientX, event.clientY)
                          }}
                          onPointerUp={end}
                        >
                          <Text truncate as="span" size="sm" weight="semibold">
                            {item.record.title}
                          </Text>
                          {bottom - top >= 30 && (
                            <Text as="span" size="sm">
                              {dayjs(item.start).format('HH:mm')} –{' '}
                              {dayjs(item.end).format('HH:mm')}
                              {item.schedule?.settings.recurrence ? ' ↻' : ''}
                            </Text>
                          )}
                        </Box>
                        {canResize && !!item.endField && !disabled && (
                          <Box
                            aria-label={t('scheduling.resize', {
                              title: item.record.title
                            })}
                            as="button"
                            bottom="0"
                            className="monolith-time-resize"
                            height="12px"
                            left="0"
                            position="absolute"
                            width="100%"
                            onClick={event => event.stopPropagation()}
                            onKeyDown={event => keyboard(event, item, true)}
                            onLostPointerCapture={cancel}
                            onPointerCancel={cancel}
                            onPointerDown={event =>
                              begin(event, item, 'resize', day)
                            }
                            onPointerMove={event => {
                              lastPointer.current = {
                                x: event.clientX,
                                y: event.clientY
                              }
                              update(event.clientX, event.clientY)
                            }}
                            onPointerUp={end}
                          />
                        )}
                      </Stack>
                    )
                  )}
                </Box>
              ))}
            </Grid>
          </Flex>
        </Box>
      </Box>
      <Text aria-live="polite" color="muted" role="status" size="sm">
        {preview
          ? `${dayjs(preview.start).format('ddd HH:mm')} – ${dayjs(preview.end).format('ddd HH:mm')}`
          : ''}
      </Text>
    </Stack>
  )
}
