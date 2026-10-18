import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import test, { after } from 'node:test'

import {
  budgetMiB,
  childEnvironment,
  macAvailableMemory
} from './build-guard.mjs'

const root = path.resolve(import.meta.dirname, '..')
const guard = path.join(root, 'tools/build-guard.mjs')
const work = path.join(root, '.temp/build-guard-tests')
const fixture = path.join(work, 'fixture.mjs')
const observations = []
after(async () => {
  await fs.writeFile(
    path.join(work, 'latest-evidence.json'),
    JSON.stringify(
      { checkedUtc: new Date().toISOString(), observations },
      null,
      2
    )
  )
})
await fs.mkdir(work, { recursive: true })
await fs.writeFile(
  fixture,
  `
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const [mode, output, guard] = process.argv.slice(2);
if(mode==='hold') {
  fs.writeFileSync(output, JSON.stringify({pid:process.pid,heap:process.env.NODE_OPTIONS}));
  setTimeout(()=>{}, 3000);
} else if(mode==='long') {
  fs.writeFileSync(output, JSON.stringify({pid:process.pid})); setTimeout(()=>{}, 30000);
} else if(mode==='nested') {
  const run = (name) => {
    const child=spawn(process.execPath,[guard,'--',process.execPath,import.meta.filename,'hold',output+name],{stdio:['ignore','pipe','pipe'],env:process.env});
    let text=''; child.stdout.on('data',b=>text+=b);child.stderr.on('data',b=>text+=b);
    return {child,done:new Promise(resolve=>child.on('exit',code=>resolve({code,text})))};
  };
  const first=run('-first');
  for(let n=0;!fs.existsSync(output+'-first')&&n<200;n++)await new Promise(r=>setTimeout(r,50));
  if(!fs.existsSync(output+'-first'))throw Error('First nested command did not start');
  const second=await run('-second').done;
  if(second.code===0||!second.text.includes('Only one build'))throw Error('Parallel sibling was allowed: '+second.text);
  if((await first.done).code!==0)throw Error('First nested command failed');
  if((await run('-third').done).code!==0)throw Error('Sequential nested command failed');
  fs.writeFileSync(output, JSON.stringify({parallelRejected:true,sequentialPassed:true}));
} else if(mode==='exit')process.exit(7);
`
)

function run(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv }
  delete env.MONOLITH_BUILD_LEASE
  const child = spawn(process.execPath, [guard, '--', ...args], {
    cwd: root,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  child.stdout.on('data', chunk => {
    output += chunk
  })
  child.stderr.on('data', chunk => {
    output += chunk
  })
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', code => {
      observations.push({ code, output: output.slice(-1600) })
      resolve({ code, output })
    })
  })
  return { child, done }
}
async function ready(file, child) {
  for (let attempt = 0; attempt < 250; attempt++) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'))
    } catch {}
    if (child.exitCode !== null)
      throw Error('Owned test process exited before readiness')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw Error('Owned test process did not become ready')
}
const unique = label => path.join(work, `${label}-${process.pid}.json`)

test('memory cap cannot be raised and heap/worker limits override inherited values', () => {
  assert.equal(budgetMiB(), 4096)
  assert.throws(() => budgetMiB('8192'))
  assert.throws(() => budgetMiB('0'))
  const old = process.env.NODE_OPTIONS
  process.env.NODE_OPTIONS =
    '--max-old-space-size=8192 --max-old-space-size-percentage=90 --no-warnings'
  try {
    const env = childEnvironment('fixture', 4096)
    assert.equal(env.NODE_OPTIONS, '--no-warnings --max-old-space-size=2048')
    assert.equal(env.RAYON_NUM_THREADS, '2')
    assert.equal(env.CARGO_BUILD_JOBS, '1')
  } finally {
    if (old === undefined) delete process.env.NODE_OPTIONS
    else process.env.NODE_OPTIONS = old
  }
})

test(
  'independent build is refused before launching a second command',
  { timeout: 30000 },
  async () => {
    const marker = unique('first'),
      secondMarker = unique('second')
    const first = run([process.execPath, fixture, 'hold', marker])
    try {
      await ready(marker, first.child)
      const second = await run([
        process.execPath,
        fixture,
        'hold',
        secondMarker
      ]).done
      assert.notEqual(second.code, 0, second.output)
      assert.match(second.output, /Another Monolith build/)
      await assert.rejects(fs.access(secondMarker))
      assert.equal((await first.done).code, 0)
    } finally {
      if (first.child.exitCode === null) first.child.kill()
    }
  }
)

test(
  'nested package commands stay serial without deadlocking',
  { timeout: 45000 },
  async () => {
    const marker = unique('nested')
    const result = await run([
      process.execPath,
      fixture,
      'nested',
      marker,
      guard
    ]).done
    assert.equal(result.code, 0, result.output)
    assert.deepEqual(JSON.parse(await fs.readFile(marker, 'utf8')), {
      parallelRejected: true,
      sequentialPassed: true
    })
  }
)

test(
  'failure exit status is preserved and lock is released',
  { timeout: 20000 },
  async () => {
    const result = await run([
      process.execPath,
      fixture,
      'exit',
      unique('exit')
    ]).done
    assert.equal(result.code, 7, result.output)
    const next = await run([process.execPath, '-e', 'process.exit(0)']).done
    assert.equal(next.code, 0, next.output)
  }
)

test(
  'terminating the owned wrapper removes its compiler child',
  { skip: process.platform !== 'win32', timeout: 25000 },
  async () => {
    const marker = unique('cancel')
    const owned = run([process.execPath, fixture, 'long', marker])
    try {
      const { pid } = await ready(marker, owned.child)
      owned.child.kill()
      await owned.done
      let alive = true
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          process.kill(pid, 0)
        } catch {
          alive = false
          break
        }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      assert.equal(alive, false, 'Owned compiler survived its guard')
    } finally {
      if (owned.child.exitCode === null) owned.child.kill()
    }
  }
)

test(
  'Windows denies a commitment above a small isolated OS cap',
  { skip: process.platform !== 'win32', timeout: 30000 },
  async () => {
    const probe = path.join(work, 'memory-probe.ps1')
    await fs.writeFile(
      probe,
      `
$ErrorActionPreference='Stop'
Add-Type -Path '${path.join(root, 'tools/build-guard.windows.cs').replaceAll("'", "''")}'
if([MonolithBuildBudget]::CanStart(8589934591,50,4096)){throw 'Low start reserve accepted'}
if(-not [MonolithBuildBudget]::CanStart(8589934592,74,4096)){throw 'Healthy start rejected'}
if([MonolithBuildBudget]::CanStart(17179869184,75,4096)){throw 'High start load accepted'}
if([MonolithBuildBudget]::CanContinue(6442450943,50,4096)){throw 'Low running reserve accepted'}
if([MonolithBuildBudget]::CanContinue(17179869184,80,4096)){throw 'High running load accepted'}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AllocationProbe {
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr VirtualAlloc(IntPtr p, UIntPtr bytes, uint kind, uint protection);
 [DllImport("kernel32.dll")] static extern bool VirtualFree(IntPtr p, UIntPtr bytes, uint kind);
 public static bool Run() {
  var denied=VirtualAlloc(IntPtr.Zero,new UIntPtr(512UL*1024*1024),0x3000,4);
  if(denied!=IntPtr.Zero){VirtualFree(denied,UIntPtr.Zero,0x8000);return false;}
  var small=VirtualAlloc(IntPtr.Zero,new UIntPtr(1024*1024),0x3000,4);
  if(small==IntPtr.Zero)return false;
  Marshal.WriteByte(small,7);VirtualFree(small,UIntPtr.Zero,0x8000);return true;
 }
}
'@
if(-not [AllocationProbe]::Run()){throw 'OS allocation ceiling was not enforced'}
Write-Output 'OS_CAP_PROBE_PASSED'
`
    )
    const powershell = path.join(
      process.env.SystemRoot,
      'System32/WindowsPowerShell/v1.0/powershell.exe'
    )
    const result = await run(
      [powershell, '-NoProfile', '-NonInteractive', '-File', probe],
      { MONOLITH_BUILD_MEMORY_MIB: '256' }
    ).done
    assert.equal(result.code, 0, result.output)
    assert.match(result.output, /OS_CAP_PROBE_PASSED/)
  }
)

test('all checked-in build scripts are guarded and Turbo is serial', async () => {
  const turbo = JSON.parse(
    await fs.readFile(path.join(root, 'turbo.json'), 'utf8')
  )
  assert.equal(turbo.concurrency, '1')
  assert.ok(turbo.globalPassThroughEnv.includes('MONOLITH_BUILD_LEASE'))
  const files = ['package.json', 'tools/package.json']
  for (const base of ['apps', 'packages', 'modules']) {
    for (const entry of await fs.readdir(path.join(root, base), {
      withFileTypes: true
    }))
      if (entry.isDirectory())
        files.push(path.join(base, entry.name, 'package.json'))
  }
  let checked = 0
  for (const file of files) {
    let pkg
    try {
      pkg = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    for (const [name, script] of Object.entries(pkg.scripts || {})) {
      if (
        !/^build(?::|-|$)/.test(name) ||
        name === 'build:guard:test' ||
        name === 'build:safe'
      )
        continue
      assert.match(script, /build-guard\.mjs/, file + ':' + name)
      assert.equal(typeof pkg.monolithBuilds[name], 'string')
      checked++
    }
  }
  assert.ok(checked > 50)
})

test('macOS reserves include inactive pages without counting active or wired memory', () => {
  const report = pageSize =>
    `Mach Virtual Memory Statistics: (page size of ${pageSize} bytes)\nPages free: 262144.\nPages inactive: 1835008.\nPages active: 200000.\nPages wired down: 300000.\nPages purgeable: 100000.\n`
  assert.equal(macAvailableMemory(report(4096)), 8 * 1024 ** 3)
  assert.equal(macAvailableMemory(report(16384)), 32 * 1024 ** 3)
  assert.throws(() => macAvailableMemory('unavailable'))
  assert.throws(() =>
    macAvailableMemory(
      report(4096).replace('Pages inactive: 1835008.', 'Pages inactive: -1.')
    )
  )
})
