type Connection = { remoteId: string; apiHost?: string }

class ConnectionRegistry {
  private readonly modules = new WeakMap<object, string>()
  apiHost = ''

  set(contract: object, connection: Connection): void {
    if (connection.apiHost !== undefined) this.apiHost = connection.apiHost
    this.modules.set(contract, connection.remoteId)
  }

  get(contract: object): { remoteId: string; apiHost: string } | undefined {
    const remoteId = this.modules.get(contract)
    return remoteId === undefined
      ? undefined
      : { remoteId, apiHost: this.apiHost }
  }
}

export const globalProxyRegistry = new ConnectionRegistry()
