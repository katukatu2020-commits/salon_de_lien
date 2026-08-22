param(
  [string]$Region = 'ap-northeast-1',
  [string]$SecretId = 'salon-de-lien-staging/platform-operator',
  [string]$Cluster = 'salon-de-lien-staging-cluster',
  [string]$Service = 'salon-de-lien-staging-web'
)

$ErrorActionPreference = 'Stop'
$password = [string]$env:PLATFORM_OPERATOR_NEW_PASSWORD

if ($password.Length -lt 10) {
  throw 'PLATFORM_OPERATOR_NEW_PASSWORD must contain at least 10 characters.'
}

$current = aws secretsmanager get-secret-value `
  --secret-id $SecretId `
  --region $Region `
  --no-cli-pager | ConvertFrom-Json

if (-not $current.SecretString) {
  throw 'The platform operator secret does not contain SecretString.'
}

$values = $current.SecretString | ConvertFrom-Json
$env:PLATFORM_OPERATOR_PASSWORD_INPUT = $password
try {
  $passwordHash = node -e "const {randomBytes,scryptSync}=require('node:crypto');const p=process.env.PLATFORM_OPERATOR_PASSWORD_INPUT||'';const s=randomBytes(16).toString('hex');process.stdout.write('scrypt$'+s+'$'+scryptSync(p,s,64).toString('hex'));"
} finally {
  Remove-Item Env:PLATFORM_OPERATOR_PASSWORD_INPUT -ErrorAction SilentlyContinue
  Remove-Item Env:PLATFORM_OPERATOR_NEW_PASSWORD -ErrorAction SilentlyContinue
  $password = $null
}

if ($passwordHash -notmatch '^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$') {
  throw 'Failed to create a valid scrypt password hash.'
}

$values.PLATFORM_OPERATOR_PASSWORD_HASH = $passwordHash
$temporaryPath = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText(
    $temporaryPath,
    ($values | ConvertTo-Json -Depth 20),
    [System.Text.UTF8Encoding]::new($false)
  )

  aws secretsmanager put-secret-value `
    --secret-id $SecretId `
    --secret-string "file://$temporaryPath" `
    --region $Region `
    --no-cli-pager | Out-Null
} finally {
  Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
}

aws ecs update-service `
  --cluster $Cluster `
  --service $Service `
  --force-new-deployment `
  --region $Region `
  --no-cli-pager | Out-Null

Write-Output 'Platform operator password hash rotated and ECS restart requested.'
