[CmdletBinding()]
param(
  [string]$PrinterName = 'POS-80C',
  [int]$Port = 17615
)

$ErrorActionPreference = 'Stop'
$installRoot = Join-Path $env:LOCALAPPDATA 'ORIMIA Print Bridge'
$sourcePath = Join-Path $PSScriptRoot 'OrimiaPosBridge.cs'
$installedSource = Join-Path $installRoot 'OrimiaPosBridge.cs'
$executablePath = Join-Path $installRoot 'OrimiaPosBridge.exe'
$configPath = Join-Path $installRoot 'config.json'
$selfTestPath = Join-Path $installRoot 'self-test.json'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'ORIMIA POS Print Bridge'

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Bridge source was not found: $sourcePath"
}
if (-not (Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue)) {
  throw "Printer '$PrinterName' is not installed."
}
if ($Port -lt 1024 -or $Port -gt 65535) {
  throw 'Port must be between 1024 and 65535.'
}

$compilerCandidates = @(
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
  (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) {
  throw '.NET Framework C# compiler was not found.'
}

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Get-CimInstance Win32_Process -Filter "Name='OrimiaPosBridge.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -eq $executablePath } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Copy-Item -LiteralPath $sourcePath -Destination $installedSource -Force
$references = @(
  '/reference:System.dll',
  '/reference:System.Core.dll',
  '/reference:System.Drawing.dll',
  '/reference:System.Web.Extensions.dll'
)
$compilerArgs = @('/nologo', '/target:winexe', '/optimize+', "/out:$executablePath") + $references + @($installedSource)
& $compiler @compilerArgs
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $executablePath)) {
  throw 'ORIMIA POS Print Bridge compilation failed.'
}

$config = [ordered]@{ PrinterName = $PrinterName; Port = $Port }
[IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))

Remove-Item -LiteralPath $selfTestPath -Force -ErrorAction SilentlyContinue
$selfTest = Start-Process -FilePath $executablePath -ArgumentList '--self-test' -WindowStyle Hidden -Wait -PassThru
if ($selfTest.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $selfTestPath)) {
  throw 'ORIMIA POS Print Bridge self-test failed.'
}

$runCommand = '"{0}"' -f $executablePath
New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name $runName -Value $runCommand
Start-Process -FilePath $executablePath -WindowStyle Hidden

$status = $null
for ($attempt = 1; $attempt -le 20; $attempt += 1) {
  try {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 2
    if ($status.available -and $status.version -eq 'v583') { break }
  } catch {}
  Start-Sleep -Milliseconds 250
}
if (-not $status.available) {
  throw 'ORIMIA POS Print Bridge did not become ready.'
}

[pscustomobject]@{
  Installed = $true
  Version = $status.version
  Printer = $status.printerName
  Endpoint = "http://127.0.0.1:$Port"
  Startup = $true
  SelfTest = $selfTestPath
} | Format-List
