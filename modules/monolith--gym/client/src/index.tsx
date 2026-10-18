import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { useAuth } from '@monolith/api'

import { GymProvider } from './GymProvider'
import GymWorkspace from './GymWorkspace'
import './styles.css'

dayjs.extend(localizedFormat)

export default function Gym() {
  const { userData } = useAuth()

  return (
    <GymProvider key={userData?.id ?? 'loading'}>
      <GymWorkspace />
    </GymProvider>
  )
}
