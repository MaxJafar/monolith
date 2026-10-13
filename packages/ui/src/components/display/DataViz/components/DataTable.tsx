import { screenReaderTable } from '../DataViz.css'
import { formatNumber } from '../constants'
import { isChartValue } from '../model'
import type { ChartProps } from '../types'

export function DataTable({
  points,
  label,
  formatValue = formatNumber
}: ChartProps) {
  return (
    <table className={screenReaderTable}>
      <caption>{label}</caption>
      <tbody>
        {points.map((point, index) => (
          <tr key={index}>
            <th scope="row">{point.label}</th>
            <td>
              {isChartValue(point.value) ? formatValue(point.value) : '—'}
            </td>
            {point.detail && <td>{point.detail}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
