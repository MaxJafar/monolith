// SPDX-License-Identifier: 0BSD
import { z } from 'zod'

import { GetGoogleFontResponseSchema } from '../../types/fonts'
import type { UntypedEndpointType } from '../../types/proxy'
import type { EndpointClient } from '../endpointClient'

function helper<Input extends z.ZodType, Output extends z.ZodType>(
  path: string,
  input: Input,
  output: Output
) {
  return { path, schema: { input, output } }
}

export const CORE_HELPERS = {
  checkAPIKeys: helper(
    'apiKeys/entries/checkKeys',
    z.object({ keys: z.string() }),
    z.boolean()
  ),
  getAPIKeys: helper(
    'apiKeys/entries/get',
    z.object({ keyId: z.string() }),
    z.string()
  ),
  checkModuleAvailability: helper(
    'modules/checkModuleAvailability',
    z.object({ id: z.string() }),
    z.boolean()
  ),
  corsAnywhere: helper(
    'corsAnywhere',
    z.object({ url: z.string() }),
    z.string()
  ),
  getGoogleFont: helper(
    'fonts/google/get',
    z.object({ family: z.string() }),
    GetGoogleFontResponseSchema
  )
}
export type CoreHelperName = keyof typeof CORE_HELPERS
type HelperInput<Name extends CoreHelperName> = z.infer<
  (typeof CORE_HELPERS)[Name]['schema']['input']
>
type HelperOutput<Name extends CoreHelperName> = z.infer<
  (typeof CORE_HELPERS)[Name]['schema']['output']
>
export type CoreHelperReturnTypes = {
  [Name in CoreHelperName]: (
    input: HelperInput<Name>
  ) => EndpointClient<
    UntypedEndpointType<HelperOutput<Name>, never, HelperInput<Name>>
  >
}
