import { z } from 'zod'

import { serviceJSON } from './serviceRequest'

const placesResponse = z.object({
  places: z
    .array(
      z.object({
        displayName: z.object({ text: z.string() }),
        formattedAddress: z.string(),
        location: z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180)
        })
      })
    )
    .optional()
})

export default async function searchLocations(
  credential: string,
  query: string
) {
  if (!query.trim()) return []

  const result = await serviceJSON(
    'Google Places',
    'https://places.googleapis.com/v1/places:searchText',
    placesResponse,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': credential,
        'X-Goog-FieldMask':
          'places.displayName,places.location,places.formattedAddress'
      },
      body: JSON.stringify({ textQuery: query.trim() })
    }
  )

  return (result.places ?? []).map(({ displayName, ...place }) => ({
    ...place,
    name: displayName.text
  }))
}
