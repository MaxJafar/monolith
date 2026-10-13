import type { ChartPoint } from './model'

export type ChartProps = {
  points: ChartPoint[]
  label: string
  formatValue?: (value: number) => string
  emptyLabel?: string
}
