import { type SavedView, viewConfigSchema } from '../../../shared'

export type ViewInput = Pick<
  SavedView,
  'name' | 'mode' | 'group_field_id' | 'config'
>

/** Panels own their changed settings; a delayed filter save must not undo a tab rename. */
export function mergeViewEdit(
  current: ViewInput,
  previous: ViewInput,
  next: ViewInput
): ViewInput {
  const config = { ...current.config }
  for (const key of new Set([
    ...Object.keys(previous.config),
    ...Object.keys(next.config)
  ])) {
    const property = key as keyof ViewInput['config']
    if (
      JSON.stringify(previous.config[property]) !==
      JSON.stringify(next.config[property])
    )
      Object.assign(config, { [property]: next.config[property] })
  }
  return {
    name: previous.name === next.name ? current.name : next.name,
    mode: previous.mode === next.mode ? current.mode : next.mode,
    group_field_id:
      previous.group_field_id === next.group_field_id
        ? current.group_field_id
        : next.group_field_id,
    config: viewConfigSchema.parse(config)
  }
}
