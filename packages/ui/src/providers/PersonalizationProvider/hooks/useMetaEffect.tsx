import { useEffect } from 'react'

/** Keep the product mark stable; preserve touch icons and other install assets. */
export default function useMetaEffect() {
  useEffect(() => {
    let icon = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"][type="image/svg+xml"]'
    )
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      icon.type = 'image/svg+xml'
      document.head.appendChild(icon)
    }
    icon.href = '/icon.svg'
  }, [])
}
