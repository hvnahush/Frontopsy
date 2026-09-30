import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { config } from '../config.js'
import { HttpError } from '../httpError.js'

// Addresses a public website never lives at. Loading them from the server would let
// anyone probe our own network (or a cloud metadata endpoint) through a checkup.
const privateRanges = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  privateRanges.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  privateRanges.addSubnet(network, prefix, 'ipv6')
}

function isPrivateAddress(address: string) {
  // An IPv4-mapped IPv6 address (::ffff:10.0.0.1) is really the IPv4 address inside it.
  // (A ::ffff:0:0/96 rule can't be used instead: BlockList checks every IPv4 address
  // against IPv6 rules in that mapped form, so it would block everything.)
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1]
  if (dotted) return isPrivateAddress(dotted)
  // URL parsing rewrites it in hex, e.g. [::ffff:127.0.0.1] becomes [::ffff:7f00:1].
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address)
  if (hex) {
    const [high, low] = [parseInt(hex[1]!, 16), parseInt(hex[2]!, 16)]
    return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`)
  }
  const family = isIP(address)
  if (family === 0) return true
  return privateRanges.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

type HostCheck = 'public' | 'private' | 'unknown'

const hostCache = new Map<string, Promise<HostCheck>>()

/** Whether every address the hostname resolves to is public. Results are cached per process. */
function checkHost(hostname: string): Promise<HostCheck> {
  if (config.CHECKUP_ALLOW_PRIVATE_URLS) return Promise.resolve('public')

  const host = hostname.replace(/^\[|\]$/g, '')
  let result = hostCache.get(host)
  if (!result) {
    result = (isIP(host) ? Promise.resolve([{ address: host }]) : lookup(host, { all: true, verbatim: true }))
      .then((addresses): HostCheck =>
        addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address)) ? 'public' : 'private',
      )
      .catch((): HostCheck => {
        // DNS hiccups are often temporary, so don't remember failures.
        hostCache.delete(host)
        return 'unknown'
      })
    hostCache.set(host, result)
    if (hostCache.size > 1000) hostCache.delete(hostCache.keys().next().value!)
  }
  return result
}

export async function isPublicHost(hostname: string) {
  return (await checkHost(hostname)) === 'public'
}

/** Parses a user-submitted link and rejects anything we shouldn't load. */
export async function parseCheckupUrl(input: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new HttpError(400, 'Enter a full link, like https://yourwebsite.com')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'Only http and https links can be checked.')
  }
  if (url.username || url.password) {
    throw new HttpError(400, 'Links with a username or password in them can’t be checked.')
  }
  const host = await checkHost(url.hostname)
  if (host === 'unknown') {
    throw new HttpError(400, `We couldn’t find ${url.hostname}. Check the link for typos.`)
  }
  if (host === 'private') {
    throw new HttpError(400, 'We can only check sites that are publicly reachable on the internet.')
  }

  url.hash = ''
  return url
}
