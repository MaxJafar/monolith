// SPDX-License-Identifier: 0BSD
/** An intentional HTTP failure safe for the route adapter to report. */
export default class ClientError extends Error {
  readonly name = 'ClientError'
  constructor(
    message: string,
    public code = 400
  ) {
    super(message)
  }
  static isClientError(value: unknown): value is ClientError {
    return value instanceof this
  }
}
