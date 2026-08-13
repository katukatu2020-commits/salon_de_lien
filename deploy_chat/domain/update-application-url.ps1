param(
  [string]$SecretId = "arn:aws:secretsmanager:ap-northeast-1:009293460979:secret:salon-de-lien-staging/application-8mneEp",
  [string]$AppUrl = "https://salon-de-lien.com",
  [string]$Region = "ap-northeast-1"
)

$ErrorActionPreference = "Stop"

$secretText = aws secretsmanager get-secret-value `
  --secret-id $SecretId `
  --region $Region `
  --query SecretString `
  --output text
if ($LASTEXITCODE -ne 0 -or -not $secretText) {
  throw "The application secret could not be loaded."
}

$secret = $secretText | ConvertFrom-Json
$secret.APP_URL = $AppUrl.TrimEnd("/")
$temporarySecret = New-TemporaryFile
try {
  $json = $secret | ConvertTo-Json -Depth 100 -Compress
  [System.IO.File]::WriteAllText($temporarySecret.FullName, $json, [System.Text.UTF8Encoding]::new($false))
  aws secretsmanager put-secret-value `
    --secret-id $SecretId `
    --region $Region `
    --secret-string "file://$($temporarySecret.FullName)" `
    --query "{ARN:ARN,VersionId:VersionId}" `
    --output json
  if ($LASTEXITCODE -ne 0) {
    throw "The application URL secret update failed."
  }
}
finally {
  Remove-Item -LiteralPath $temporarySecret.FullName -Force -ErrorAction SilentlyContinue
}
