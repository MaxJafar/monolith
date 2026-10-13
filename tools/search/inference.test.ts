import assert from 'node:assert/strict'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { answer, embed, rank } from '../../apps/api/src/lib/search/inference'

test('inference rejects duplicate embedding IDs, forged relevance IDs and invalid citations', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lifeforge-search-test-'))
  const token = path.join(dir, 'token')
  await writeFile(token, 'a'.repeat(40))
  const savedFetch = globalThis.fetch
  const savedURL = process.env.SHARED_AI_URL,
    savedToken = process.env.SHARED_AI_TOKEN_FILE
  process.env.SHARED_AI_URL = 'http://127.0.0.1:8771'
  process.env.SHARED_AI_TOKEN_FILE = token
  let reply: unknown
  globalThis.fetch = async () => new Response(JSON.stringify(reply))
  try {
    reply = {
      data: [
        { index: 0, embedding: Array(768).fill(1) },
        { index: 0, embedding: Array(768).fill(1) }
      ]
    }
    await assert.rejects(embed(['one', 'two'], 'document'), /indexes/)
    reply = {
      scores: [{ id: 99, relevance: 0.9, confidence: 0.9, truncated: false }]
    }
    await assert.rejects(rank('query', ['passage']), /indexes/)
    reply = {
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              statements: [{ text: 'Unsupported claim', citations: [2] }]
            })
          }
        }
      ]
    }
    await assert.rejects(
      answer('question', [
        { title: 'source', text: 'Evidence', inferred: false }
      ])
    )
    reply = {
      choices: [
        { finish_reason: 'length', message: { content: '{"statements":[]}' } }
      ]
    }
    await assert.rejects(
      answer('question', [
        { title: 'source', text: 'Evidence', inferred: false }
      ]),
      /Incomplete/
    )
    reply = {
      choices: [
        { finish_reason: 'stop', message: { content: '{"statements":[]}' } }
      ]
    }
    assert.deepEqual(
      await answer('question', [
        { title: 'source', text: 'Evidence', inferred: false }
      ]),
      []
    )
  } finally {
    globalThis.fetch = savedFetch
    if (savedURL === undefined) delete process.env.SHARED_AI_URL
    else process.env.SHARED_AI_URL = savedURL
    if (savedToken === undefined) delete process.env.SHARED_AI_TOKEN_FILE
    else process.env.SHARED_AI_TOKEN_FILE = savedToken
    await unlink(token)
    await rmdir(dir)
  }
})
