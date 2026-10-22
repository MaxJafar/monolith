import type { LookupAddress } from 'node:dns'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Network = {
  hosts: Record<string, string>
  pages: Record<string, { status: number; body?: string; location?: string }>
  connections: Array<{ url: string; pinned: unknown }>
}

const network = vi.hoisted((): Network => ({
  hosts: {},
  pages: {},
  connections: []
}))

vi.mock('node:dns/promises', () => ({
  lookup: async (host: string) =>
    network.hosts[host]
      ? [{ address: network.hosts[host], family: 4 }]
      : Promise.reject(new Error('ENOTFOUND'))
}))
vi.mock('node:http', () => ({
  request: (
    url: URL,
    options: {
      lookup: (
        host: string,
        options: { all: boolean },
        callback: (error: null, addresses: LookupAddress[]) => void
      ) => void
    },
    respond: (response: unknown) => void
  ) => {
    let pinned: unknown

    options.lookup(url.hostname, { all: true }, (_error, addresses) => {
      pinned = addresses
    })
    network.connections.push({ url: url.href, pinned })

    const page = network.pages[url.href] ?? { status: 404 }

    return {
      on: () => undefined,
      end: () =>
        queueMicrotask(() =>
          respond(
            Object.assign(Readable.from([Buffer.from(page.body ?? '')]), {
              statusCode: page.status,
              headers: {
                'content-type': 'text/plain',
                ...(page.location ? { location: page.location } : {})
              }
            })
          )
        )
    }
  }
}))

const { isPublicAddress, publicResponse } =
  await import('../core/functions/external/publicRequest')

afterEach(() => {
  network.hosts = {}
  network.pages = {}
  network.connections = []
})

describe('public-only remote requests', () => {
  it.each(['93.184.215.14', '1.1.1.1', '2606:4700:4700::1111'])(
    'treats %s as public',
    address => expect(isPublicAddress(address)).toBe(true)
  )
  it.each([
    '127.0.0.1',
    '10.0.0.8',
    '172.16.4.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fd00:ec2::254',
    'fe80::1',
    '::ffff:127.0.0.1',
    '64:ff9b::7f00:1',
    'not-an-address'
  ])('blocks %s', address => expect(isPublicAddress(address)).toBe(false))

  it('connects only to the address it validated', async () => {
    network.hosts['feed.test'] = '93.184.215.14'
    network.pages['http://feed.test/rss'] = { status: 200, body: 'items' }

    expect(await publicResponse('Feed', 'http://feed.test/rss')).toEqual({
      text: 'items',
      contentType: 'text/plain'
    })
    expect(network.connections).toEqual([
      {
        url: 'http://feed.test/rss',
        pinned: [{ address: '93.184.215.14', family: 4 }]
      }
    ])
  })

  it('re-validates every redirect and never connects to a private hop', async () => {
    network.hosts['feed.test'] = '93.184.215.14'
    network.hosts['metadata.test'] = '169.254.169.254'
    network.pages['http://feed.test/'] = {
      status: 302,
      location: 'http://metadata.test/latest/meta-data/'
    }

    await expect(publicResponse('Feed', 'http://feed.test/')).rejects.toThrow(
      'Feed returned an invalid response'
    )
    expect(network.connections.map(item => item.url)).toEqual([
      'http://feed.test/'
    ])
  })

  it('follows public redirects but stops a redirect loop', async () => {
    network.hosts['feed.test'] = '93.184.215.14'
    network.pages['http://feed.test/old'] = { status: 301, location: '/new' }
    network.pages['http://feed.test/new'] = { status: 200, body: 'moved' }
    network.pages['http://feed.test/loop'] = { status: 302, location: '/loop' }

    expect((await publicResponse('Feed', 'http://feed.test/old')).text).toBe(
      'moved'
    )
    await expect(
      publicResponse('Feed', 'http://feed.test/loop')
    ).rejects.toThrow()
    expect(
      network.connections.filter(item => item.url.endsWith('/loop'))
    ).toHaveLength(6)
  })

  it('rejects responses over the size limit', async () => {
    network.hosts['feed.test'] = '93.184.215.14'
    network.pages['http://feed.test/big'] = { status: 200, body: 'x'.repeat(9) }

    await expect(
      publicResponse('Feed', 'http://feed.test/big', {}, 8)
    ).rejects.toThrow()
  })
})
