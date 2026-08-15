function Initialize-LienAwsCli {
  if (Get-Command "aws" -ErrorAction SilentlyContinue) { return }

  $candidates = @(
    (Join-Path $env:ProgramFiles "Amazon\AWSCLIV2\aws.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Amazon\AWSCLIV2\aws.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Amazon\AWSCLIV2\aws.exe")
  )
  $awsExecutable = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
  if (-not $awsExecutable) { return }

  $awsDirectory = Split-Path -Parent $awsExecutable
  $env:PATH = "$awsDirectory;$env:PATH"
}
