// Run with pnpm exec node tools/ai-host/deploy.mjs after installing the pinned models/runtime.
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const privateRoot = join(homedir(), '.lifeforge-ai')
mkdirSync(privateRoot, { recursive: true })
const sshConfig =
  process.env.SHARED_AI_SSH_CONFIG || join(homedir(), '.searchx/ssh/config')
const alias = process.env.SHARED_AI_SSH_ALIAS || 'searchx-mini'
const ssh = code =>
  execFileSync(
    'ssh',
    ['-F', sshConfig, alias, 'tr -d "\\r" | /opt/homebrew/bin/python3.12 -'],
    {
      input: code,
      encoding: 'utf8',
      timeout: 60000
    }
  )
const remoteRoot = ssh(
  'import pathlib; print(pathlib.Path.home()/"services/lifeforge-ai")\n'
).trim()
const credentialsPath = join(privateRoot, 'credentials.json')
const tokens = existsSync(credentialsPath)
  ? JSON.parse(readFileSync(credentialsPath, 'utf8'))
  : {
      lifeforge: randomBytes(32).toString('base64url'),
      golden_retriever: randomBytes(32).toString('base64url')
    }
writeFileSync(credentialsPath, JSON.stringify(tokens), { mode: 0o600 })
writeFileSync(join(privateRoot, 'lifeforge.token'), tokens.lifeforge, {
  mode: 0o600
})
const config = {
  tokens,
  embedding_model: 'lifeforge-embeddinggemma',
  generation_model: 'lifeforge-gemma',
  llama_binary: `${remoteRoot}/llama/llama-b11588/llama-server`,
  engines: {
    generation: {
      model: remoteRoot.replace(
        '/services/lifeforge-ai',
        '/.lmstudio/models/google/gemma-4-E2B-it-qat-q4_0-gguf/gemma-4-E2B_q4_0-it.gguf'
      ),
      alias: 'lifeforge-gemma',
      port: 1244,
      context: 8192,
      batch: 1024,
      gpu_layers: 99,
      threads: 4,
      extra_args: [
        '--mmproj',
        remoteRoot.replace(
          '/services/lifeforge-ai',
          '/.lmstudio/models/google/gemma-4-E2B-it-qat-q4_0-gguf/mmproj-gemma-4-E2B-it.gguf'
        ),
        '--jinja',
        '--chat-template-kwargs',
        '{"enable_thinking":false}'
      ]
    },
    embedding: {
      model: remoteRoot.replace(
        '/services/lifeforge-ai',
        '/.lmstudio/models/ggml-org/embeddinggemma-2-GGUF/embeddinggemma-2-Q8_0.gguf'
      ),
      alias: 'lifeforge-embeddinggemma',
      port: 1235,
      context: 8192,
      batch: 8192,
      gpu_layers: 99,
      threads: 4,
      extra_args: ['--embedding', '--pooling', 'mean']
    },
    laya: {
      model: `${remoteRoot}/models/native/Laya-Q8_0.gguf`,
      alias: 'laya-english',
      port: 1236,
      context: 2048,
      batch: 2048,
      gpu_layers: 99,
      threads: 4,
      extra_args: []
    }
  },
  multilingual: {
    binary: `${remoteRoot}/llama/llama.cpp-ffc55c93bc33c1935983c0177375669bf0d7de35/build/bin/llama-laya-cli`,
    model: `${remoteRoot}/models/native/Laya-Multilingual-F16.gguf`,
    threads: 4
  }
}
// Preserve operator tuning across source deployments.
const previous = existsSync(join(privateRoot, 'config.json'))
  ? JSON.parse(readFileSync(join(privateRoot, 'config.json'), 'utf8'))
  : {}
if (previous.engines) config.engines = previous.engines
if (previous.multilingual) config.multilingual = previous.multilingual
writeFileSync(join(privateRoot, 'config.json'), JSON.stringify(config), {
  mode: 0o600
})
for (const name of ['server.py', 'start.py', 'prepare-multilingual.py']) {
  execFileSync(
    'scp',
    [
      '-F',
      sshConfig,
      resolve('tools/ai-host', name),
      `${alias}:${remoteRoot}/${name}`
    ],
    { stdio: 'pipe' }
  )
}
execFileSync(
  'scp',
  [
    '-F',
    sshConfig,
    join(privateRoot, 'config.json'),
    `${alias}:${remoteRoot}/config.json`
  ],
  { stdio: 'pipe' }
)
ssh(`import pathlib,plistlib,os,subprocess,time
root=pathlib.Path(${JSON.stringify(remoteRoot)})
root.chmod(0o700);(root/'config.json').chmod(0o600)
label='com.lifeforge.shared-ai'; domain='gui/'+str(os.getuid())
folder=pathlib.Path.home()/'Library/LaunchAgents';folder.mkdir(exist_ok=True)
file=folder/(label+'.plist')
plist={'Label':label,'ProgramArguments':['/opt/homebrew/bin/python3.12',str(root/'start.py')],
'WorkingDirectory':str(root),'RunAtLoad':True,'KeepAlive':True,'ThrottleInterval':30,
'StandardOutPath':str(root/'service.log'),'StandardErrorPath':str(root/'service-error.log')}
file.write_bytes(plistlib.dumps(plist));file.chmod(0o600)
subprocess.run(['launchctl','bootout',domain+'/'+label],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for attempt in range(20):
    result=subprocess.run(['launchctl','bootstrap',domain,str(file)],capture_output=True)
    if result.returncode==0:break
    time.sleep(1)
else:raise RuntimeError('LaunchAgent bootstrap failed after shutdown wait')
print('Mac mini inference LaunchAgent installed')
`)
copyFileSync(resolve('tools/ai-host/tunnel.py'), join(privateRoot, 'tunnel.py'))
writeFileSync(
  join(privateRoot, 'tunnel.json'),
  JSON.stringify({
    ssh:
      process.env.SHARED_AI_SSH_BINARY || 'C:/Windows/System32/OpenSSH/ssh.exe',
    config: sshConfig,
    alias
  })
)
const envPath = resolve('env/.env.local')
const current = readFileSync(envPath, 'utf8')
const marker =
  /^SHARED_AI_(URL|TOKEN_FILE|EMBEDDING_MODEL|GENERATION_MODEL)=.*\r?\n?/gm
if (!existsSync(join(privateRoot, 'lifeforge.env.before')))
  writeFileSync(join(privateRoot, 'lifeforge.env.before'), current, {
    mode: 0o600
  })
writeFileSync(
  envPath,
  current.replace(marker, '').trimEnd() +
    `\n\nSHARED_AI_URL=http://127.0.0.1:8771\nSHARED_AI_TOKEN_FILE=${join(privateRoot, 'lifeforge.token').replaceAll('\\', '/')}\nSHARED_AI_EMBEDDING_MODEL=lifeforge-embeddinggemma\nSHARED_AI_GENERATION_MODEL=lifeforge-gemma\n`
)
if (process.platform === 'win32') {
  const sid = execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'
    ],
    { encoding: 'utf8' }
  ).trim()
  if (!/^S-1-[0-9-]+$/.test(sid))
    throw new Error('Cannot resolve private credential owner')
  execFileSync(
    'icacls',
    [
      privateRoot,
      '/inheritance:r',
      '/grant:r',
      `*${sid}:(OI)(CI)F`,
      '*S-1-5-18:(OI)(CI)F',
      '*S-1-5-32-544:(OI)(CI)F'
    ],
    { stdio: 'pipe' }
  )
  for (const file of readdirSync(privateRoot, { withFileTypes: true }).filter(
    file => file.isFile()
  )) {
    execFileSync(
      'icacls',
      [
        join(privateRoot, file.name),
        '/inheritance:r',
        '/grant:r',
        `*${sid}:F`,
        '*S-1-5-18:F',
        '*S-1-5-32-544:F'
      ],
      { stdio: 'pipe' }
    )
  }
}
console.log(
  'Installed shared host source and LifeForge private connection settings. No credentials printed.'
)
