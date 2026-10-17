import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  type ProcessConfig,
  codexEvent,
  openclawResult,
  processProvider
} from './agentAdapters'
import { type ClaimedWork, requiredWorkerChecks } from './agentWorker'

const config: ProcessConfig = {
  adapter: 'cli',
  cwd: tmpdir(),
  model: 'fixture-model',
  inputCentsPerMillion: 10000,
  outputCentsPerMillion: 20000,
  cachedInputCentsPerMillion: 1000
}
const work = {
  run: { id: 'f0362a0c-f6eb-4fe4-ad5e-6d050f391e41', estimated_cents: 50 },
  lease: 'not-used-by-process',
  task: { title: 'Fixture $(touch forbidden)', content: 'Synthetic context' },
  instructions: 'Return evidence',
  context: []
}
const checkedWork: ClaimedWork = {
  ...work,
  playbooks: [
    {
      id: '07e4f214-9b39-4d75-b88c-c952fd870de1',
      name: 'Fixture protocol',
      description: 'Synthetic adapter test',
      instructions: 'Verify the received check identifier.',
      checks: ['Validate the task input protocol'],
      require_review: true,
      revision: 2
    }
  ]
}
const scratch: string[] = []
afterEach(async () => {
  await Promise.all(
    scratch.splice(0).map(path => rm(path, { recursive: true, force: true }))
  )
})

async function stub(source: string) {
  const cwd = await mkdtemp(join(tmpdir(), 'zillion-adapter-test-'))
  scratch.push(cwd)
  const file = join(cwd, 'worker.cjs')
  await writeFile(file, source)

  return { ...config, cwd, command: process.execPath, args: [file] }
}

async function executable(source: string) {
  const runtime = await stub(source)
  const file = runtime.args[0]

  if (!file) throw new Error('Fixture executable missing')
  await writeFile(file, '#!' + process.execPath + '\n' + source, {
    mode: 0o700
  })
  await chmod(file, 0o700)

  return { ...runtime, command: file, args: [] }
}

describe('Local agent protocols and process boundaries', () => {
  it('reads Codex cumulative totals once, preserving cached input and session identity', () => {
    const state = { result: '', session: '', terminal: false, failed: false }
    const events = [
      { type: 'thread.started', thread_id: 'session-1' },
      {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Verified' }
      },
      {
        type: 'turn.completed',
        usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 20 }
      }
    ]

    for (const event of [...events, events[2]])
      codexEvent(JSON.stringify(event), config, state)
    expect(state).toMatchObject({
      result: 'Verified',
      session: 'session-1',
      terminal: true,
      usage: {
        input_tokens: 100,
        cached_input_tokens: 60,
        output_tokens: 20,
        total_tokens: 120,
        reported_cost_cents: 1
      }
    })
    expect(() =>
      codexEvent(
        JSON.stringify({
          type: 'turn.completed',
          usage: { input_tokens: 10, cached_input_tokens: 20, output_tokens: 1 }
        }),
        config,
        state
      )
    ).toThrow()
  })
  it('supports OpenClaw root and gateway result envelopes without using delivery', () => {
    const root = {
      ok: true,
      status: 'ok',
      final: 'Done',
      usage: { input: 100, output: 20, total: 120 },
      provider: 'fixture',
      sessionId: 'oc-session'
    }
    expect(openclawResult(JSON.stringify(root), config)).toMatchObject({
      result: 'Done',
      failed: false,
      usage: { total_tokens: 120, session_id: 'oc-session' }
    })
    expect(
      openclawResult(
        JSON.stringify({
          status: 'ok',
          result: {
            payloads: [{ text: 'Gateway result' }],
            meta: {
              agentMeta: {
                provider: 'fixture',
                sessionId: 'g1',
                model: 'actual-fixture-model',
                usage: {
                  input: 100,
                  cacheRead: 150,
                  cacheWrite: 10,
                  output: 20
                }
              }
            }
          }
        }),
        config
      )
    ).toMatchObject({
      result: 'Gateway result',
      usage: {
        input_tokens: 260,
        cached_input_tokens: 150,
        total_tokens: 280,
        model: 'actual-fixture-model'
      }
    })
    expect(() =>
      openclawResult(JSON.stringify({ final: 'No invented counts' }), config)
    ).toThrow()
  })
  it('executes a trusted argv process with JSON stdin, Unicode output and metering checkpoints', async () => {
    const runtime = await stub(
      `let input=''; process.stdin.on('data',c=>input+=c); process.stdin.on('end',()=>{ const task=JSON.parse(input); process.stdout.write(JSON.stringify({result:'完成 '+task.task.title,provider:'fixture',model:'actual-cli-model',session_id:'c1',usage:{input_tokens:100,cached_input_tokens:60,output_tokens:20}})); });`
    )
    const progress: unknown[] = []
    const output = await processProvider(runtime)(
      work,
      new AbortController().signal,
      async usage => {
        progress.push(usage)
      }
    )
    expect(output.result).toContain('完成 Fixture $(touch forbidden)')
    expect(output).toMatchObject({
      cost_cents: 1,
      usage: {
        total_tokens: 120,
        cached_input_tokens: 60,
        model: 'actual-cli-model'
      }
    })
    expect(progress).toHaveLength(1)
  })
  it('runs the Codex JSONL protocol with a read-only sandbox and an stdin task', async () => {
    const runtime =
      await executable(`let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{ for(const event of [
      {type:'thread.started',thread_id:'stub-thread'},
      {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({argv:process.argv.slice(2),input,privateEnvironment:!!(process.env.DATABASE_URL || process.env.ZILLION_AGENT_TOKEN)})}},
      {type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:60,output_tokens:20}}
    ])process.stdout.write(JSON.stringify(event)+'\\n'); });`)
    const output = await processProvider({ ...runtime, adapter: 'codex' })(
      work,
      new AbortController().signal
    )
    const result = JSON.parse(output.result)
    expect(result.argv).toEqual([
      'exec',
      '--json',
      '--color',
      'never',
      '--sandbox',
      'read-only',
      '--model',
      'fixture-model',
      '--cd',
      runtime.cwd,
      '-'
    ])
    expect(result.input).toContain(work.task.title)
    expect(result.input).not.toContain(work.lease)
    expect(result.privateEnvironment).toBe(false)
    expect(output.usage).toMatchObject({
      provider: 'codex',
      session_id: 'stub-thread',
      total_tokens: 120
    })
  })
  it('checkpoints known Codex usage before an interrupted process exits', async () => {
    const runtime = await executable(
      `process.stdin.resume();process.stdin.on('end',()=>{ process.stdout.write(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:60,output_tokens:20}})+'\\n'); setInterval(()=>{},1000); });`
    )
    const abort = new AbortController(),
      progress: unknown[] = []
    await expect(
      processProvider({ ...runtime, adapter: 'codex' })(
        work,
        abort.signal,
        async usage => {
          progress.push(usage)
          abort.abort()
        }
      )
    ).rejects.toMatchObject({ usage: { total_tokens: 120 }, cost_cents: 1 })
    expect(progress).toHaveLength(1)
  })
  it('passes OpenClaw a private task file, isolated session key and no delivery flag', async () => {
    const runtime = await executable(
      `const fs=require('node:fs');const argv=process.argv.slice(2),file=argv[argv.indexOf('--message-file')+1];process.stdout.write(JSON.stringify({status:'ok',result:{payloads:[{text:JSON.stringify({argv,mode:fs.statSync(file).mode&511,input:fs.readFileSync(file,'utf8')})}],meta:{agentMeta:{sessionId:'oc-stub',provider:'fixture',model:'fixture-model',usage:{input:100,cacheRead:60,output:20}}}}}));`
    )
    const output = await processProvider({
      ...runtime,
      adapter: 'openclaw',
      openclawAgent: 'fixture'
    })(work, new AbortController().signal)
    const result = JSON.parse(output.result)
    expect(result.argv.slice(0, 5)).toEqual([
      'agent',
      '--agent',
      'fixture',
      '--model',
      'fixture-model'
    ])
    expect(result.argv).toContain('zillion:' + work.run.id)
    expect(result.argv).not.toContain('--deliver')
    expect(result.mode).toBe(0o600)
    expect(result.input).toContain(work.task.title)
    expect(output.usage).toMatchObject({
      input_tokens: 160,
      cached_input_tokens: 60,
      total_tokens: 180
    })
  })
  it('preserves known usage on a nonzero exit and rejects missing accounting', async () => {
    const runtime = await stub(
      `process.stdin.resume(); process.stdin.on('end',()=>{ process.stdout.write(JSON.stringify({result:'Partial',usage:{input_tokens:100,output_tokens:20}})); process.exitCode=7; });`
    )
    await expect(
      processProvider(runtime)(work, new AbortController().signal)
    ).rejects.toMatchObject({ cost_cents: 2, usage: { total_tokens: 120 } })
    const unknown = await stub(
      `process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write(JSON.stringify({result:'Unmetered'})));`
    )
    await expect(
      processProvider(unknown)(work, new AbortController().signal)
    ).rejects.toThrow('unsupported usage')
  })
  it('terminates a cancelled process promptly and disallows adapter/sandbox misconfiguration', async () => {
    const runtime = await stub(
      `process.stdin.resume(); setInterval(()=>{},1000);`
    )
    const abort = new AbortController()
    const running = processProvider(runtime)(work, abort.signal)
    setTimeout(() => abort.abort(), 100)
    await expect(running).rejects.toThrow('stopped')
    expect(() =>
      processProvider({
        ...config,
        adapter: 'codex',
        sandbox: 'danger-full-access'
      })
    ).toThrow('sandbox')
    expect(() =>
      processProvider({
        ...config,
        adapter: 'openclaw',
        openclawAgent: '--deliver'
      })
    ).toThrow()
  })

  it('forwards playbooks and exact check identifiers to a local CLI and retains its evidence', async () => {
    const runtime = await stub(
      `let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{const task=JSON.parse(input);if(task.required_checks[0].check_id!==task.playbooks[0].id+':0')process.exit(9);process.stdout.write(JSON.stringify({result:JSON.stringify({playbooks:task.playbooks,checks:task.required_checks,instructions:task.result_instructions}),quality_report:[{check_id:task.required_checks[0].check_id,passed:true,evidence:'Fixture parsed stdin and verified the exact supplied check identifier.'}],usage:{input_tokens:100,cached_input_tokens:60,output_tokens:20}}));});`
    )
    const output = await processProvider(runtime)(
      checkedWork,
      new AbortController().signal
    )
    const result = JSON.parse(output.result)

    expect(result.playbooks).toEqual(checkedWork.playbooks)
    expect(result.checks).toEqual(requiredWorkerChecks(checkedWork))
    expect(result.instructions).toContain('Never invent checks')
    expect(output.quality_report).toEqual([
      {
        check_id: '07e4f214-9b39-4d75-b88c-c952fd870de1:0',
        passed: true,
        evidence:
          'Fixture parsed stdin and verified the exact supplied check identifier.'
      }
    ])
    expect(output.cost_cents).toBe(1)
  })

  it.each(['codex', 'openclaw'] as const)(
    'passes checks to %s and parses structured final text while retaining accounting',
    async adapter => {
      const runtime = await executable(
        `const fs=require('node:fs');let stdin='';process.stdin.on('data',c=>stdin+=c);process.stdin.on('end',()=>{const argv=process.argv.slice(2);const isClaw=argv[0]==='agent';const input=isClaw?fs.readFileSync(argv[argv.indexOf('--message-file')+1],'utf8'):stdin;const task=JSON.parse(input.slice(input.indexOf('{"run_id"')));if(task.required_checks[0].check_id!==task.playbooks[0].id+':0')process.exit(9);const final=JSON.stringify({result:JSON.stringify({playbooks:task.playbooks,checks:task.required_checks}),quality_report:[{check_id:task.required_checks[0].check_id,passed:true,evidence:'Fixture read its task prompt and verified the supplied check ID.'}]});if(isClaw)process.stdout.write(JSON.stringify({status:'ok',result:{final,meta:{agentMeta:{sessionId:'claw-quality',usage:{input:100,cacheRead:60,output:20}}}}}));else for(const event of [{type:'thread.started',thread_id:'codex-quality'},{type:'item.completed',item:{type:'agent_message',text:final}},{type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:60,output_tokens:20}}])process.stdout.write(JSON.stringify(event)+'\\n');});`
      )
      const output = await processProvider({
        ...runtime,
        adapter,
        ...(adapter === 'openclaw' ? { openclawAgent: 'fixture' } : {})
      })(checkedWork, new AbortController().signal)
      const result = JSON.parse(output.result)

      expect(result.playbooks).toEqual(checkedWork.playbooks)
      expect(result.checks).toEqual(requiredWorkerChecks(checkedWork))
      expect(output.quality_report).toMatchObject([
        { check_id: '07e4f214-9b39-4d75-b88c-c952fd870de1:0', passed: true }
      ])
      expect(output.usage?.total_tokens).toBe(adapter === 'codex' ? 120 : 180)
      expect(output.cost_cents).toBe(adapter === 'codex' ? 1 : 2)
    }
  )

  it('preserves CLI accounting when quality evidence is missing or a check fails', async () => {
    for (const quality_report of [
      undefined,
      [
        {
          check_id: requiredWorkerChecks(checkedWork)[0]!.check_id,
          passed: false,
          evidence: 'Fixture could not perform the configured check.'
        }
      ]
    ]) {
      const runtime = await stub(
        `process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(JSON.stringify(${JSON.stringify({ result: 'Incomplete fixture', quality_report, usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 20 } })})));`
      )

      await expect(
        processProvider(runtime)(checkedWork, new AbortController().signal)
      ).rejects.toMatchObject({
        cost_cents: 1,
        usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 20 }
      })
    }
  })
})
