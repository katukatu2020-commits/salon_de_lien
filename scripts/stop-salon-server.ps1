$ErrorActionPreference = "SilentlyContinue"

$repoName = "salon_de_lien_good_front_abb9a84"
$processes = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -like "*$repoName*" -and
    ($_.CommandLine -like "*next*" -or $_.CommandLine -like "*node_modules*")
  }

foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
  Write-Host "Stopped node process $($process.ProcessId)"
}

