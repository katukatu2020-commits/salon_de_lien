param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$SecretId = "salon-de-lien-staging/application"
)

$ErrorActionPreference = "Stop"

function Read-DotEnv([string]$Path) {
  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $values }

  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    if ($line -notmatch '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { continue }
    $value = $matches[2]
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$matches[1]] = $value
  }
  return $values
}

$environment = @{}
foreach ($path in @(".env", ".env.local")) {
  $values = Read-DotEnv $path
  foreach ($key in $values.Keys) { $environment[$key] = $values[$key] }
}

$gmailKeys = @(
  "GMAIL_RESERVATION_EMAIL",
  "GMAIL_OAUTH_CLIENT_ID",
  "GMAIL_OAUTH_CLIENT_SECRET",
  "GMAIL_OAUTH_REFRESH_TOKEN",
  "GMAIL_SYNC_CRON_SECRET"
)
foreach ($key in $gmailKeys) {
  if ([string]::IsNullOrWhiteSpace($environment[$key])) {
    throw "$key is missing from .env or .env.local"
  }
}

$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
if (-not (Test-Path -LiteralPath $aws)) { $aws = "aws" }

function Read-Secret([string]$VersionStage) {
  $arguments = @(
    "secretsmanager", "get-secret-value",
    "--secret-id", $SecretId,
    "--profile", $Profile,
    "--region", $Region,
    "--query", "SecretString",
    "--output", "text",
    "--no-cli-pager"
  )
  if ($VersionStage) { $arguments += @("--version-stage", $VersionStage) }
  $raw = & $aws @arguments
  if ($LASTEXITCODE -ne 0) { throw "Could not read Secrets Manager value" }
  try { return $raw | ConvertFrom-Json } catch { return $null }
}

$secret = Read-Secret ""
if ($null -eq $secret) {
  $secret = Read-Secret "AWSPREVIOUS"
}
if ($null -eq $secret) { throw "No valid application secret version was found" }

foreach ($key in $gmailKeys) {
  $secret | Add-Member -NotePropertyName $key -NotePropertyValue $environment[$key] -Force
}

$secretPath = Join-Path ([IO.Path]::GetTempPath()) "lien-gmail-secret-$([Guid]::NewGuid().ToString('N')).json"
[IO.File]::WriteAllText(
  $secretPath,
  ($secret | ConvertTo-Json -Compress),
  [Text.UTF8Encoding]::new($false)
)

try {
  $result = & $aws secretsmanager put-secret-value `
    --secret-id $SecretId `
    --secret-string "file://$secretPath" `
    --profile $Profile `
    --region $Region `
    --output json `
    --no-cli-pager | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "Could not update Secrets Manager value" }
} finally {
  Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue
}

$validated = Read-Secret ""
if ($null -eq $validated) { throw "Stored application secret is not valid JSON" }

[pscustomobject]@{
  SecretId = $SecretId
  VersionId = $result.VersionId
  GmailKeysStored = $gmailKeys.Count
  JsonValid = $true
}
