import { describe, expect, it } from 'vitest'

import { toResponsesInput } from '../core/functions/external/ai/providers/openai.provider'

describe('shared AI image input', () => {
  it('normalizes text and receipt/calendar images without dropping their content', () => {
    expect(
      toResponsesInput([
        { role: 'system', content: 'Extract an event' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Read this receipt' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,fixture',
                detail: 'high'
              }
            }
          ]
        }
      ])
    ).toEqual([
      { role: 'system', content: 'Extract an event' },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Read this receipt' },
          {
            type: 'input_image',
            image_url: 'data:image/png;base64,fixture',
            detail: 'high'
          }
        ]
      }
    ])
  })
  it('rejects unsupported tool transcripts explicitly', () => {
    expect(() =>
      toResponsesInput([
        { role: 'tool', tool_call_id: 'fixture', content: 'result' }
      ])
    ).toThrow('Tool messages')
  })
})
