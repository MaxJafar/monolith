/** Normalize invalid bounds and keep pointer, keyboard and typed values aligned. */
export function sliderRange(
  value: number,
  min: number,
  max: number,
  step: number
) {
  const lower = Number.isFinite(min) ? min : 0
  const upper = Number.isFinite(max) ? Math.max(lower, max) : lower
  const increment = Number.isFinite(step) && step > 0 ? step : 1
  const clamped = Math.min(
    upper,
    Math.max(lower, Number.isFinite(value) ? value : lower)
  )
  const aligned = Math.min(
    upper,
    Math.max(
      lower,
      Number(
        (lower + Math.round((clamped - lower) / increment) * increment).toFixed(
          10
        )
      )
    )
  )

  return {
    min: lower,
    max: upper,
    step: increment,
    value: aligned,
    progress: upper > lower ? ((aligned - lower) / (upper - lower)) * 100 : 0,
    fixed: upper === lower
  }
}
