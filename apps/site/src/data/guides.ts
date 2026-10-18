import type { MarkdownInstance } from 'astro'

export type GuideFrontmatter = {
  title: string
  description: string
  section: string
  order: number
}
export type Guide = MarkdownInstance<GuideFrontmatter> & { slug: string }
const files = import.meta.glob<MarkdownInstance<GuideFrontmatter>>(
  '../content/*.md',
  { eager: true }
)
export const guides: Guide[] = Object.entries(files)
  .map(([path, doc]) => ({
    ...doc,
    slug: path.split('/').pop()!.replace(/\.md$/, '')
  }))
  .sort((a, b) => a.frontmatter.order - b.frontmatter.order)
export const sections = [
  'Start here',
  'Your workspace',
  'Extend Monolith',
  'Host & build'
]
export function searchableGuides() {
  return guides.map((guide) => ({
    title: guide.frontmatter.title,
    description: guide.frontmatter.description,
    section: guide.frontmatter.section,
    url: `/docs/${guide.slug}`,
    body: guide
      .rawContent()
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*_`>|]/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  }))
}
