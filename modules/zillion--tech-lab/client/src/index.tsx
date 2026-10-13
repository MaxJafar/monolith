import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { useAuth } from '@lifeforge/api'

import { TechLabProvider } from './TechLabProvider'
import TechLabWorkspace from './TechLabWorkspace'
import './styles.css'

dayjs.extend(localizedFormat)

export default function TechLab() {
  const { userData } = useAuth()

  return (
    <TechLabProvider key={userData?.id ?? 'loading'}>
      <TechLabWorkspace />
    </TechLabProvider>
  )
}
