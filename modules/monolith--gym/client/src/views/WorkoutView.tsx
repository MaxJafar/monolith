import { useGym } from '@/GymContext'

import { ActiveWorkout } from '../components/ActiveWorkout'
import { StartWorkout } from '../components/StartWorkout'

export default function WorkoutView() {
  const { data } = useGym()

  if (!data) return null

  return data.active ? (
    <ActiveWorkout key={data.active.id} workout={data.active} />
  ) : (
    <StartWorkout />
  )
}
