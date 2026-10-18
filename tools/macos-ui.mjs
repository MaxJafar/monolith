// Native acceptance against the installed app; no test bridge ships in Monolith.
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

if (process.platform !== 'darwin') throw Error('Run on the authorized Mac')
const root = resolve('.temp/macos-ui')
const evidence = resolve(
  homedir(),
  'Library/Containers/app.monolith.nativeuitests.xctrunner/Data/Documents/monolith-ui'
)
mkdirSync(evidence, { recursive: true })
for (const file of ['fixture.json', 'widgets.json'])
  if (existsSync(resolve(root, file)))
    copyFileSync(resolve(root, file), resolve(evidence, file))
const project = resolve(root, 'MonolithUITests.xcodeproj')
mkdirSync(resolve(project, 'xcshareddata/xcschemes'), { recursive: true })
const id = n => String(n).padStart(24, '0')
const source = resolve('tools/macos-ui/NativeUITests.swift')
writeFileSync(
  resolve(project, 'project.pbxproj'),
  `// !$*UTF8*$!
{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {
${id(1)} = {isa = PBXProject; buildConfigurationList = ${id(2)}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; mainGroup = ${id(3)}; productRefGroup = ${id(4)}; projectDirPath = ""; targets = (${id(5)}); };
${id(2)} = {isa = XCConfigurationList; buildConfigurations = (${id(6)}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug; };
${id(3)} = {isa = PBXGroup; children = (${id(4)}, ${id(7)}); sourceTree = "<group>"; };
${id(4)} = {isa = PBXGroup; children = (${id(8)}); name = Products; sourceTree = "<group>"; };
${id(5)} = {isa = PBXNativeTarget; buildConfigurationList = ${id(9)}; buildPhases = (${id(10)}, ${id(11)}); buildRules = (); dependencies = (); name = MonolithUITests; productName = MonolithUITests; productReference = ${id(8)}; productType = "com.apple.product-type.bundle.ui-testing"; };
${id(6)} = {isa = XCBuildConfiguration; buildSettings = { SDKROOT = macosx; MACOSX_DEPLOYMENT_TARGET = 14.0; }; name = Debug; };
${id(7)} = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${JSON.stringify(source)}; sourceTree = "<absolute>"; };
${id(8)} = {isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = MonolithUITests.xctest; sourceTree = BUILT_PRODUCTS_DIR; };
${id(9)} = {isa = XCConfigurationList; buildConfigurations = (${id(12)}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug; };
${id(10)} = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (${id(13)}); runOnlyForDeploymentPostprocessing = 0; };
${id(11)} = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0; };
${id(12)} = {isa = XCBuildConfiguration; buildSettings = { PRODUCT_NAME = "$(TARGET_NAME)"; PRODUCT_BUNDLE_IDENTIFIER = app.monolith.nativeuitests; SWIFT_VERSION = 5.0; GENERATE_INFOPLIST_FILE = YES; ALWAYS_SEARCH_USER_PATHS = NO; CODE_SIGN_IDENTITY = "-"; CODE_SIGN_STYLE = Manual; LD_RUNPATH_SEARCH_PATHS = "$(inherited) @loader_path/../Frameworks @executable_path/../Frameworks"; }; name = Debug; };
${id(13)} = {isa = PBXBuildFile; fileRef = ${id(7)}; };
}; rootObject = ${id(1)}; }
`
)
const reference = `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${id(5)}" BuildableName="MonolithUITests.xctest" BlueprintName="MonolithUITests" ReferencedContainer="container:MonolithUITests.xcodeproj"/>`
writeFileSync(
  resolve(project, 'xcshareddata/xcschemes/MonolithUITests.xcscheme'),
  `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2650" version="1.3"><BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">${reference}</BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="NO"><Testables><TestableReference skipped="NO" parallelizable="NO">${reference}</TestableReference></Testables><EnvironmentVariables><EnvironmentVariable key="MONOLITH_UI_ROOT" value="${evidence}" isEnabled="YES"/><EnvironmentVariable key="MONOLITH_UI_APP" value="${resolve(homedir(), 'Applications/Monolith.app')}" isEnabled="YES"/></EnvironmentVariables></TestAction></Scheme>`
)
const result = spawnSync(
  'xcodebuild',
  [
    'test',
    '-project',
    project,
    '-scheme',
    'MonolithUITests',
    '-destination',
    'platform=macOS,arch=arm64',
    '-derivedDataPath',
    resolve(root, 'build'),
    '-resultBundlePath',
    resolve(root, `results-${Date.now()}.xcresult`),
    '-parallel-testing-enabled',
    'NO',
    ...process.argv.slice(2)
  ],
  { stdio: 'inherit' }
)
if (result.error) throw result.error
for (const file of readdirSync(evidence))
  if (/\.(png|txt)$/.test(file))
    copyFileSync(resolve(evidence, file), resolve(root, file))
process.exit(result.status ?? 1)
