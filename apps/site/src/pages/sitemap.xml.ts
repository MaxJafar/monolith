import { guides } from '../data/guides'
import { products, addons } from '../data/products'
import type { APIContext } from 'astro'
export function GET({ site }: APIContext) {
  const paths = [
    '/',
    '/docs',
    '/addons',
    '/privacy',
    ...products.map((product) => `/product/${product.slug}`),
    ...addons.map((addon) => `/addons/${addon.slug}`),
    ...guides.map((guide) => `/docs/${guide.slug}`)
  ]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, site).href}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  )
}
