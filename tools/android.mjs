import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const project = join(root, 'apps/android')
const windows = process.platform === 'win32'
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (windows ? 'C:/DevTools/Android/Sdk' : join(homedir(), 'Library/Android/sdk'))
const jdks = join(homedir(), '.gradle/jdks')
const java = [
  process.env.JAVA_HOME,
  ...(existsSync(jdks)
    ? readdirSync(jdks)
        .filter(
          x => x.includes('21') && !x.includes('.zip') && !x.endsWith('.lock')
        )
        .map(x => join(jdks, x))
    : [])
].find(
  x =>
    x &&
    existsSync(join(x, 'bin', windows ? 'java.exe' : 'java')) &&
    !x.includes('jre')
)
const dist = join(homedir(), '.gradle/wrapper/dists/gradle-8.13-bin')
const gradle =
  process.env.MONOLITH_GRADLE_HOME ||
  (existsSync(dist)
    ? readdirSync(dist)
        .map(x => join(dist, x, 'gradle-8.13'))
        .find(x => existsSync(join(x, 'bin/gradle')))
    : null)
const task = process.argv[2] || 'doctor'

if (task === 'doctor') {
  console.log(
    JSON.stringify(
      {
        java: java ?? null,
        sdk,
        sdkInstalled: existsSync(join(sdk, 'platforms/android-36')),
        gradle: gradle ?? null,
        instruction:
          'JDK 17 or 21, Android SDK 36, Gradle 8.13. Set JAVA_HOME, ANDROID_HOME and MONOLITH_GRADLE_HOME when not discovered.'
      },
      null,
      2
    )
  )
  process.exit(
    java && gradle && existsSync(join(sdk, 'platforms/android-36')) ? 0 : 1
  )
}

if (task === 'install') {
  const apk = join(project, 'app/build/outputs/apk/debug/app-debug.apk')

  if (!existsSync(apk)) throw Error('Run pnpm android:build first')

  const result = spawnSync(
    join(sdk, 'platform-tools', windows ? 'adb.exe' : 'adb'),
    ['install', '-r', apk],
    { stdio: 'inherit', windowsHide: true }
  )
  process.exit(result.status ?? 1)
}
if (
  ![
    'assembleDebug',
    'assembleDebugAndroidTest',
    'assembleRelease',
    'testDebugUnitTest',
    'lintDebug'
  ].includes(task)
)
  throw Error('Unsupported Android task')
if (!java || !gradle)
  throw Error('Android toolchain missing. Run pnpm android:doctor.')

// The guard owns Java and every compiler child. Never start an escaping daemon.
const classpath = join(gradle, 'lib/gradle-launcher-8.13.jar')
const result = spawnSync(
  join(java, 'bin', windows ? 'java.exe' : 'java'),
  [
    '-Xmx1536m',
    '-XX:MaxMetaspaceSize=512m',
    '-Dfile.encoding=UTF-8',
    '-Dorg.gradle.internal.instrumentation.agent=false',
    '-cp',
    classpath,
    'org.gradle.launcher.GradleMain',
    '--no-daemon',
    '--max-workers=1',
    '--console=plain',
    task
  ],
  {
    cwd: project,
    stdio: 'inherit',
    windowsHide: true,
    env: {
      ...process.env,
      JAVA_HOME: java,
      ANDROID_HOME: sdk,
      GRADLE_OPTS: '-Dorg.gradle.daemon=false'
    }
  }
)

if (result.error) throw result.error
process.exit(result.status ?? 1)
