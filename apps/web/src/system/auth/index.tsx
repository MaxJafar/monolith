import { WithQueryData } from '@monolith/ui'

import workspaceAPI from '@/core/utils/workspaceAPI'

import LoginPage from './pages/LoginPage'
import UserCreationPage from './pages/UserCreationPage'

function Auth() {
  return (
    <WithQueryData contract={workspaceAPI.user.exists}>
      {exists => (exists ? <LoginPage /> : <UserCreationPage />)}
    </WithQueryData>
  )
}

export default Auth
