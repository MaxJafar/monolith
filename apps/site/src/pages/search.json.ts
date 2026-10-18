import { searchableGuides } from '../data/guides'
export function GET() {
  return new Response(JSON.stringify(searchableGuides()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}
