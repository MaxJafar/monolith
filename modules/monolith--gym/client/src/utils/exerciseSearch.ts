import type { Exercise } from '../../../shared'

export function indexExercises(exercises: Exercise[]) {
  return exercises.map(exercise => ({
    exercise,
    text: `${exercise.name} ${exercise.equipment} ${exercise.muscle_group} ${exercise.instructions}`.toLocaleLowerCase()
  }))
}

export function searchExercises(
  index: ReturnType<typeof indexExercises>,
  {
    search = '',
    muscle = '',
    customOnly = false,
    showArchived = false
  }: {
    search?: string
    muscle?: string
    customOnly?: boolean
    showArchived?: boolean
  }
) {
  const query = search.trim().toLocaleLowerCase()

  return index
    .filter(
      ({ exercise, text }) =>
        (showArchived || !exercise.archived) &&
        (!customOnly || exercise.custom) &&
        (!muscle || exercise.muscle_group === muscle) &&
        text.includes(query)
    )
    .map(({ exercise }) => exercise)
}

export function exerciseEquipment(exercises: Exercise[]) {
  return [...new Set(exercises.map(exercise => exercise.equipment))]
    .filter(Boolean)
    .sort()
}
