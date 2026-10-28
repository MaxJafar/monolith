import type { Device, Service } from '../../../shared'

// Recognisable apps get their brand mark; everything else falls back by kind.
const serviceIcons: [RegExp, string][] = [
  [/jellyfin/i, 'simple-icons:jellyfin'],
  [/home ?assistant/i, 'simple-icons:homeassistant'],
  [/node-?red/i, 'simple-icons:nodered'],
  [/\bn8n\b/i, 'simple-icons:n8n'],
  [/uptime|kuma|доступност/i, 'simple-icons:uptimekuma'],
  [/tailscale/i, 'simple-icons:tailscale'],
  [/minecraft/i, 'simple-icons:minecraft'],
  [/torrent|torrserver|magnet|qbittorrent/i, 'lucide:magnet'],
  [/smb:|shared files|samba/i, 'lucide:folder-open'],
  [/pingvin|share/i, 'lucide:share-2'],
  [/homepage/i, 'lucide:house'],
  [/openclaw|claw/i, 'lucide:bot'],
  [/hermes/i, 'lucide:feather'],
  [/omniroute|router|route/i, 'lucide:route'],
  [/glances|monitor/i, 'lucide:activity'],
  [/openai|llm|\bai\b/i, 'simple-icons:openai']
]

export function serviceIcon(service: Pick<Service, 'name' | 'url' | 'kind'>) {
  const text = `${service.name} ${service.url}`

  return (
    serviceIcons.find(([pattern]) => pattern.test(text))?.[1] ??
    (service.kind === 'game'
      ? 'lucide:gamepad-2'
      : service.kind === 'link'
        ? 'lucide:link'
        : 'lucide:server')
  )
}

export function deviceIcon(device: Pick<Device, 'os' | 'kind' | 'name'>) {
  const text = `${device.os} ${device.name}`

  if (/windows|rtx|tuf/i.test(text)) return 'mdi:microsoft-windows'
  if (/mac|apple|ios/i.test(text)) return 'simple-icons:apple'
  if (/android|pixel/i.test(text)) return 'simple-icons:android'
  if (/ubuntu/i.test(text)) return 'simple-icons:ubuntu'
  if (/alpine/i.test(text)) return 'simple-icons:alpinelinux'
  if (/linux|server|optiplex/i.test(text)) return 'mdi:linux'

  return device.kind === 'laptop'
    ? 'lucide:laptop'
    : device.kind === 'phone'
      ? 'lucide:smartphone'
      : 'lucide:monitor'
}
