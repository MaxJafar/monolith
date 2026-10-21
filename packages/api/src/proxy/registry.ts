// SPDX-License-Identifier: 0BSD
type Registration = { remoteId: string; apiHost?: string }
const routes = new WeakMap<object, Pick<Registration, 'remoteId'>>()

export const globalProxyRegistry = {
  apiHost: '',
  set(contract: object, registration: Registration): void {
    routes.set(contract, { remoteId: registration.remoteId })
    if (registration.apiHost !== undefined) this.apiHost = registration.apiHost
  },
  get(contract: object): { remoteId: string; apiHost: string } | undefined {
    const route = routes.get(contract)
    return route ? { ...route, apiHost: this.apiHost } : undefined
  }
}
