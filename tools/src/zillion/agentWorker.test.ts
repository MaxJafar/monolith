import { describe, expect, it, vi } from 'vitest'

import type { TokenUsage } from '@lifeforge/configs'

import {
  AgentRuntimeClient,
  type ClaimedWork,
  WorkerExecutionError,
  openAIProvider,
  parseWorkerOutput,
  requiredWorkerChecks,
  runWorkerOnce
} from './agentWorker'

const work: ClaimedWork = {
  run: {
    id: 'f0362a0c-f6eb-4fe4-ad5e-6d050f391e41',
    estimated_cents: 100,
    auto_approve: false
  },
  lease: 'fixture-lease',
  task: { title: 'Review fixture', content: 'Synthetic context' },
  instructions: 'Review the supplied context',
  context: [],
  playbooks: [
    {
      id: '07e4f214-9b39-4d75-b88c-c952fd870de1',
      name: 'Evidence review',
      description: 'Fixture playbook',
      instructions: 'State the inspected source.',
      checks: ['Identify the supplied source', 'State its limitations'],
      require_review: true,
      revision: 3
    }
  ]
}
const evidence = requiredWorkerChecks(work).map(check => ({
  check_id: check.check_id,
  passed: true,
  evidence: `Synthetic fixture evidence for ${check.label}`
}))
const usage: TokenUsage = {
  provider: 'fixture',
  model: 'fixture-model',
  session_id: 'fixture-session',
  input_tokens: 100,
  cached_input_tokens: 60,
  output_tokens: 20,
  total_tokens: 120,
  reported_cost_cents: 1
}
const accounting = { cost_cents: 1, usage }

describe('Immutable playbook result validation', () => {
  it('retains passing evidence with exact dispatch IDs and accepts legacy written outputs', () => {
    expect(
      parseWorkerOutput(
        work,
        JSON.stringify({
          result: 'Reviewed the fixture',
          quality_report: evidence
        }),
        accounting
      )
    ).toEqual({ result: 'Reviewed the fixture', quality_report: evidence })
    expect(
      parseWorkerOutput(
        { ...work, playbooks: undefined },
        'Existing plain written output',
        accounting
      )
    ).toEqual({ result: 'Existing plain written output' })
    expect(requiredWorkerChecks(work).map(check => check.check_id)).toEqual([
      '07e4f214-9b39-4d75-b88c-c952fd870de1:0',
      '07e4f214-9b39-4d75-b88c-c952fd870de1:1'
    ])
  })

  it.each([
    ['plain text', 'No check report'],
    ['malformed JSON', '{"result":'],
    ['missing report', JSON.stringify({ result: 'Missing' })],
    [
      'missing check',
      JSON.stringify({
        result: 'Partial',
        quality_report: evidence.slice(0, 1)
      })
    ],
    [
      'duplicate check',
      JSON.stringify({
        result: 'Repeated',
        quality_report: [evidence[0], evidence[0]]
      })
    ],
    [
      'unknown check',
      JSON.stringify({
        result: 'Unknown',
        quality_report: [
          ...evidence,
          { check_id: 'other:0', passed: true, evidence: 'Unassigned' }
        ]
      })
    ],
    [
      'failed check',
      JSON.stringify({
        result: 'Failed',
        quality_report: evidence.map((entry, index) => ({
          ...entry,
          passed: index !== 0
        }))
      })
    ],
    [
      'empty evidence',
      JSON.stringify({
        result: 'Empty evidence',
        quality_report: evidence.map(entry => ({ ...entry, evidence: '   ' }))
      })
    ],
    [
      'oversized evidence',
      JSON.stringify({
        result: 'Too large',
        quality_report: evidence.map(entry => ({
          ...entry,
          evidence: 'x'.repeat(4001)
        }))
      })
    ],
    [
      'nonboolean verdict',
      JSON.stringify({
        result: 'Invalid',
        quality_report: evidence.map(entry => ({ ...entry, passed: 'true' }))
      })
    ],
    [
      'too many entries',
      JSON.stringify({
        result: 'Too many',
        quality_report: Array.from({ length: 81 }, () => evidence[0])
      })
    ],
    ['empty result', JSON.stringify({ result: ' ', quality_report: evidence })],
    [
      'oversized result',
      JSON.stringify({ result: 'x'.repeat(100001), quality_report: evidence })
    ]
  ])('rejects %s while preserving metered usage', (_name, output) => {
    let error: unknown

    try {
      parseWorkerOutput(work, output, accounting)
    } catch (failure) {
      error = failure
    }
    expect(error).toBeInstanceOf(WorkerExecutionError)
    expect(error).toMatchObject(accounting)
  })
})

function mockedOpenAI(text: string, status = 'completed') {
  const requests: Record<string, unknown>[] = []
  const transport: typeof fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)))

    return new Response(
      JSON.stringify({
        id: 'resp_fixture',
        object: 'response',
        model: 'fixture-model',
        status,
        output: [
          {
            id: 'msg_fixture',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text, annotations: [] }]
          }
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          total_tokens: 120,
          input_tokens_details: { cached_tokens: 60 }
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
  const provider = openAIProvider({
    apiKey: 'fixture-not-a-secret',
    model: 'fixture-model',
    inputCentsPerMillion: 10000,
    cachedInputCentsPerMillion: 1000,
    outputCentsPerMillion: 20000,
    maxOutputTokens: 32,
    fetch: transport
  })

  return { provider, requests }
}

describe('OpenAI checked outputs through the installed SDK', () => {
  it('requests strict JSON output and passes immutable playbooks and exact check IDs', async () => {
    const { provider, requests } = mockedOpenAI(
      JSON.stringify({ result: 'Reviewed fixture', quality_report: evidence })
    )
    const output = await provider(work, new AbortController().signal)
    const request = requests[0]!

    expect(output).toMatchObject({
      result: 'Reviewed fixture',
      quality_report: evidence,
      cost_cents: 1,
      usage: { total_tokens: 120, cached_input_tokens: 60 }
    })
    expect(request).toMatchObject({
      store: false,
      text: { format: { type: 'json_schema', strict: true } }
    })
    const input = JSON.parse(String(request.input))

    expect(input.playbooks).toEqual(work.playbooks)
    expect(input.required_checks).toEqual(requiredWorkerChecks(work))
    expect(JSON.stringify(request.text)).toContain(evidence[0]!.check_id)
    expect(request.instructions).toContain('Never invent checks')
    expect(request.instructions).not.toContain(work.lease)
  })

  it('keeps plain text compatible for runs without quality checks', async () => {
    const { provider, requests } = mockedOpenAI('Legacy plain answer')

    expect(
      await provider(
        { ...work, playbooks: undefined },
        new AbortController().signal
      )
    ).toMatchObject({ result: 'Legacy plain answer', cost_cents: 1 })
    expect(requests[0]).not.toHaveProperty('text')
  })

  it.each([
    'Plain unsupported result',
    JSON.stringify({
      result: 'Blocked',
      quality_report: evidence.map(entry => ({ ...entry, passed: false }))
    })
  ])(
    'preserves actual provider accounting when a checked result is invalid',
    async text => {
      const { provider } = mockedOpenAI(text)

      await expect(
        provider(work, new AbortController().signal)
      ).rejects.toMatchObject({
        cost_cents: 1,
        usage: {
          provider: 'openai',
          total_tokens: 120,
          session_id: 'resp_fixture'
        }
      })
    }
  )

  it('preserves reported usage on an incomplete provider response', async () => {
    const { provider } = mockedOpenAI('Truncated', 'incomplete')

    await expect(
      provider(work, new AbortController().signal)
    ).rejects.toMatchObject({
      cost_cents: 1,
      usage: { total_tokens: 120 }
    })
  })
})

function runtimeFixture() {
  const request = vi.fn(async (endpoint: string) => {
    if (endpoint === 'inbox') return [{ id: work.run.id }]
    if (endpoint === 'claim') return work

    return undefined
  })

  return { client: { request } as unknown as AgentRuntimeClient, request }
}

describe('Worker completion evidence and failure settlement', () => {
  it('forwards validated evidence with a reviewed completion', async () => {
    const { client, request } = runtimeFixture()
    const output = {
      result: 'Reviewed',
      ...accounting,
      quality_report: evidence
    }

    expect(await runWorkerOnce(client, async () => output)).toBe('review')
    expect(request).toHaveBeenCalledWith(
      'complete',
      work.run.id,
      { lease: work.lease, ...output },
      expect.any(AbortSignal)
    )
  })

  it('settles known tokens and cost when a custom provider omits required evidence', async () => {
    const { client, request } = runtimeFixture()

    expect(
      await runWorkerOnce(client, async () => ({
        result: 'Missing',
        ...accounting
      }))
    ).toBe('failed')
    expect(request.mock.calls.some(call => call[0] === 'complete')).toBe(false)
    expect(request).toHaveBeenCalledWith(
      'fail',
      work.run.id,
      expect.objectContaining({
        lease: work.lease,
        cost_cents: 1,
        usage,
        error: expect.stringContaining('missing')
      })
    )
  })
})
