# Keep the scheduled action alive for the lifetime of its worker.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'runtime\node.exe') (Join-Path $PSScriptRoot 'repair.mjs') --watch
exit $LASTEXITCODE
