// SPDX-License-Identifier: 0BSD
import { type ReactNode, useState } from 'react'

import type { EndpointClient } from '@monolith/api'

import { CreatePasswordScreen } from './components/CreatePasswordScreen'
import { LockedScreen } from './components/LockedScreen'

interface PasswordGateProps<T> {
  controllers: {
    createPassword: EndpointClient<{ __isEndpointContract: true; __output: T }>
    getChallenge: EndpointClient
    verifyPassword: EndpointClient
  }
  hasMasterPassword: boolean
  onCreate?: (data: T) => void
  onRecoveryRequested?: () => void
  children: (masterPassword: string) => ReactNode
}

function UnlockGate<T>({
  controllers,
  onRecoveryRequested,
  children
}: PasswordGateProps<T>) {
  const [password, setPassword] = useState('')
  return password ? (
    children(password)
  ) : (
    <LockedScreen
      challengeController={controllers.getChallenge}
      verifyController={controllers.verifyPassword}
      setMasterPassword={setPassword}
      onRecoveryRequested={onRecoveryRequested}
    />
  )
}

/** Unmount the unlocked subtree when the credential is removed. */
export function WithMasterPassword<T>(props: PasswordGateProps<T>) {
  return props.hasMasterPassword ? (
    <UnlockGate {...props} />
  ) : (
    <CreatePasswordScreen
      controller={props.controllers.createPassword}
      challengeController={props.controllers.getChallenge}
      onCreate={props.onCreate}
    />
  )
}
