// SPDX-License-Identifier: 0BSD
import type { UntypedEndpointType } from '../../types/proxy'
import { EndpointClient } from '../endpointClient'
import type { CoreHelperName, CoreHelperReturnTypes } from './config'
import { CORE_HELPERS } from './config'

export function createCoreHelper<Name extends CoreHelperName>(
  apiHost: string | undefined,
  name: Name
): CoreHelperReturnTypes[Name] {
  const route = CORE_HELPERS[name].path
  return ((input: Parameters<CoreHelperReturnTypes[Name]>[0]) =>
    new EndpointClient<UntypedEndpointType>(apiHost, route).input(
      input
    )) as CoreHelperReturnTypes[Name]
}
