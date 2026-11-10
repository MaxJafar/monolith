import { useAuth } from '@monolith/api'

import { FinanceProvider } from './FinanceProvider'
import FinanceWorkspace from './FinanceWorkspace'
import './styles.css'

export default function Finance() {
  const { userData } = useAuth()

  return (
    <FinanceProvider key={userData?.id ?? 'loading'}>
      <FinanceWorkspace />
    </FinanceProvider>
  )
}
