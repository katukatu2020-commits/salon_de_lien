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
if ([string]::IsNullOrWhiteSpace($environment["OPENAI_API_KEY"])) {
  throw "OPENAI_API_KEY is missing from .env or .env.local"
}

$secretRaw = & aws secretsmanager get-secret-value `
  --secret-id $SecretId `
  --profile $Profile `
  --region $Region `
  --query SecretString `
  --output text `
  --no-cli-pager
if ($LASTEXITCODE -ne 0) { throw "Could not read Secrets Manager value" }
$secret = $secretRaw | ConvertFrom-Json
$secret | Add-Member -NotePropertyName "OPENAI_API_KEY" -NotePropertyValue $environment["OPENAI_API_KEY"] -Force

$secretPath = Join-Path ([IO.Path]::GetTempPath()) "lien-community-ai-secret-$([Guid]::NewGuid().ToString('N')).json"
try {
  [IO.File]::WriteAllText($secretPath, ($secret | ConvertTo-Json -Compress), [Text.UTF8Encoding]::new($false))
  $result = & aws secretsmanager put-secret-value `
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

[pscustomobject]@{
  SecretId = $SecretId
  VersionId = $result.VersionId
  OpenAiKeyStored = $true
}
