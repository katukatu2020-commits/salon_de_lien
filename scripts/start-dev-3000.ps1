$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
& "C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev -H 0.0.0.0
