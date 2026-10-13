type ModuleAvailability = {
  disabled?: boolean | (() => Promise<boolean>)
}

export async function resolveModuleAvailability<T extends ModuleAvailability>(
  items: T[]
): Promise<(Omit<T, 'disabled'> & { disabled: boolean })[]> {
  return Promise.all(
    items.map(async item => {
      let disabled: boolean

      try {
        disabled =
          typeof item.disabled === 'function'
            ? await item.disabled()
            : item.disabled === true
      } catch {
        // An unavailable permission check must never enable that module.
        disabled = true
      }

      return { ...item, disabled }
    })
  )
}
