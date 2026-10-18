$ErrorActionPreference = 'Stop'
try {
    $monolithRequest = $env:MONOLITH_BUILD_REQUEST | ConvertFrom-Json
    if (!$monolithRequest -or !$env:MONOLITH_BUILD_LEASE) { throw 'Missing build guard context.' }
    Add-Type -Path (Join-Path $PSScriptRoot 'build-guard.windows.cs')
    $monolithCode = [MonolithBuildBudget]::Run($monolithRequest.node, $monolithRequest.dispatcher, $monolithRequest.cwd, $monolithRequest.owner, $monolithRequest.root, $monolithRequest.limitMiB)
    exit $monolithCode
} catch {
    [Console]::Error.WriteLine('[build guard] ' + $_.Exception.Message)
    exit 1
}
