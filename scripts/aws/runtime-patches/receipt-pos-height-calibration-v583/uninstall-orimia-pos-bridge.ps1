[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ORIMIA Print Bridge'))
$localAppDataRoot = [IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$executablePath = Join-Path $installRoot 'OrimiaPosBridge.exe'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'ORIMIA POS Print Bridge'

if (-not $installRoot.StartsWith($localAppDataRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to remove an unexpected path: $installRoot"
}

Get-CimInstance Win32_Process -Filter "Name='OrimiaPosBridge.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -eq $executablePath } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Remove-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $installRoot) {
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}

[pscustomobject]@{ Installed = $false; Removed = $installRoot } | Format-List
