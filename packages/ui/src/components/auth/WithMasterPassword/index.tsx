import React, { useState } from 'react'

import type { EndpointClient } from '@monolith/api'

import { CreatePasswordScreen } from './components/CreatePasswordScreen'
import { LockedScreen } from './components/LockedScreen'

export function WithMasterPassword<TCreationOutput>({
  controllers,
  hasMasterPassword,
  onCreate,
  onRecoveryRequested,
  children
}: {
  controllers: {
    createPassword: EndpointClient<{
      __isEndpointContract: true
      __output: TCreationOutput
    }>
    getChallenge: EndpointClient
    verifyPassword: EndpointClient
  }
  hasMasterPassword: boolean
  onCreate?: (data: TCreationOutput) => void
  onRecoveryRequested?: () => void
  children: (masterPassword: string) => React.ReactNode
}) {
  const [masterPassword, setMasterPassword] = useState('')

  if (!hasMasterPassword) {
    return (
      <CreatePasswordScreen
        challengeController={controllers.getChallenge}
        controller={controllers.createPassword}
        onCreate={onCreate}
      />
    )
  }

  if (masterPassword === '') {
    return (
      <LockedScreen
        challengeController={controllers.getChallenge}
        setMasterPassword={setMasterPassword}
        verifyController={controllers.verifyPassword}
        onRecoveryRequested={onRecoveryRequested}
      />
    )
  }

  return children(masterPassword)
}
