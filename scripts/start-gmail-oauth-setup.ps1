$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$stdout = Join-Path $root ".gmail-oauth-setup.out.log"
$stderr = Join-Path $root ".gmail-oauth-setup.err.log"
$node = (Get-Command node.exe).Source
$result = & $node (Join-Path $root "scripts/start-gmail-oauth-setup.mjs")
$processId = [regex]::Match(($result -join "`n"), 'PID (\d+)').Groups[1].Value

[pscustomobject]@{
  ProcessId = $processId
  OutputLog = $stdout
  ErrorLog = $stderr
}
