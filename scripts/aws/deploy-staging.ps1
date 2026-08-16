param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$ImageTag = "",
  [string]$DatabaseDumpPath = "",
  [string]$DomainName = "",
  [string]$HostedZoneId = "",
  [string]$HostedZoneName = "",
  [bool]$CostOptimized = $true,
  [switch]$StartService
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli
Assert-LienApprovedAutomationContext -Action "staging application deployment" -Profile $Profile -Region $Region

if (-not $ImageTag) {
  $sha = (& git rev-parse --short=12 HEAD).Trim()
  $ImageTag = "$sha-$(Get-Date -Format 'yyyyMMddHHmmss')"
}
if ($StartService -and -not $CostOptimized -and (-not $DomainName -or -not $HostedZoneId -or -not $HostedZoneName)) {
  throw "StartService requires DomainName, HostedZoneId, and HostedZoneName so authentication is served over HTTPS."
}
if ($DatabaseDumpPath -and -not (Test-Path -LiteralPath $DatabaseDumpPath)) {
  throw "Database dump was not found: $DatabaseDumpPath"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/preflight.ps1 -Profile $Profile -Region $Region
if ($LASTEXITCODE -ne 0) { throw "Preflight failed" }

$identity = (& aws sts get-caller-identity --profile $Profile --region $Region --no-cli-pager | ConvertFrom-Json)
$account = $identity.Account
$env:CDK_DEFAULT_ACCOUNT = $account
$env:CDK_DEFAULT_REGION = $Region
$app = 'npx tsx infrastructure/bin/app.ts'
$context = @(
  '-c', 'environment=staging',
  '-c', "imageTag=$ImageTag",
  '-c', "region=$Region",
  '-c', "costOptimized=$($CostOptimized.ToString().ToLowerInvariant())"
)
if ($DomainName) {
  $context += @('-c', "domainName=$DomainName", '-c', "hostedZoneId=$HostedZoneId", '-c', "hostedZoneName=$HostedZoneName")
}

& npx.cmd cdk --app $app bootstrap "aws://$account/$Region" --profile $Profile
if ($LASTEXITCODE -ne 0) { throw "CDK bootstrap failed" }

& npx.cmd cdk --app $app deploy SalonDeLien-staging @context -c desiredCount=0 --profile $Profile --require-approval never
if ($LASTEXITCODE -ne 0) { throw "Foundation deployment failed" }

$outputs = (& aws cloudformation describe-stacks --stack-name SalonDeLien-staging --profile $Profile --region $Region --query 'Stacks[0].Outputs' --output json --no-cli-pager | ConvertFrom-Json)
function Output-Value([string]$Key) {
  $item = $outputs | Where-Object { $_.OutputKey -eq $Key } | Select-Object -First 1
  if (-not $item) { throw "Stack output not found: $Key" }
  return [string]$item.OutputValue
}

$repositoryUri = Output-Value 'RepositoryUri'
$dockerContext = (& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/prepare-docker-context.ps1 | Select-Object -Last 1).Trim()
if (-not $dockerContext -or -not (Test-Path -LiteralPath $dockerContext -PathType Container)) {
  throw "Docker context preparation failed"
}
& docker build --pull -t "salon-de-lien:$ImageTag" $dockerContext
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
$ecrPassword = & aws ecr get-login-password --profile $Profile --region $Region
$ecrPassword | & docker login --username AWS --password-stdin "$account.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) { throw "ECR login failed" }
& docker tag "salon-de-lien:$ImageTag" "${repositoryUri}:$ImageTag"
& docker push "${repositoryUri}:$ImageTag"
if ($LASTEXITCODE -ne 0) { throw "ECR push failed" }

function Run-OneOffTask([string[]]$Command, [hashtable]$Environment = @{}) {
  $cluster = Output-Value 'ClusterName'
  $taskDefinition = Output-Value 'TaskDefinitionArn'
  $subnets = (Output-Value 'ApplicationSubnetIds').Split(',')
  $securityGroup = Output-Value 'ApplicationSecurityGroupId'
  $assignPublicIp = Output-Value 'AssignPublicIp'
  $environmentOverrides = @()
  foreach ($entry in $Environment.GetEnumerator()) {
    $environmentOverrides += @{ name = [string]$entry.Key; value = [string]$entry.Value }
  }
  $overrides = @{ containerOverrides = @(@{ name = 'Web'; command = $Command; environment = $environmentOverrides }) } | ConvertTo-Json -Depth 8 -Compress
  $overridesPath = Join-Path ([IO.Path]::GetTempPath()) "lien-ecs-overrides-$([Guid]::NewGuid().ToString('N')).json"
  [IO.File]::WriteAllText($overridesPath, $overrides, [Text.UTF8Encoding]::new($false))
  $network = "awsvpcConfiguration={subnets=[$($subnets -join ',')],securityGroups=[$securityGroup],assignPublicIp=$assignPublicIp}"
  try {
    $taskArn = (& aws ecs run-task --cluster $cluster --task-definition $taskDefinition --launch-type FARGATE --network-configuration $network --overrides "file://$overridesPath" --profile $Profile --region $Region --query 'tasks[0].taskArn' --output text --no-cli-pager).Trim()
  } finally {
    Remove-Item -LiteralPath $overridesPath -Force -ErrorAction SilentlyContinue
  }
  if ($LASTEXITCODE -ne 0 -or -not $taskArn -or $taskArn -eq 'None') { throw "Failed to start one-off ECS task" }
  & aws ecs wait tasks-stopped --cluster $cluster --tasks $taskArn --profile $Profile --region $Region
  $result = (& aws ecs describe-tasks --cluster $cluster --tasks $taskArn --profile $Profile --region $Region --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' --output json --no-cli-pager | ConvertFrom-Json)
  if ($result.exitCode -ne 0) { throw "One-off ECS task failed: $($result.reason)" }
}

if ($DatabaseDumpPath) {
  $bucket = Output-Value 'PrivateAssetsBucket'
  $dumpHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DatabaseDumpPath).Hash.ToLowerInvariant()
  $dumpKey = "private/migrations/$ImageTag/salon-de-lien.dump"
  & aws s3 cp $DatabaseDumpPath "s3://$bucket/$dumpKey" --sse AES256 --profile $Profile --region $Region --no-progress
  if ($LASTEXITCODE -ne 0) { throw "Database dump upload failed" }
  Run-OneOffTask @('node', 'scripts/import-postgres-dump.mjs', "s3://$bucket/$dumpKey") @{
    ALLOW_DATABASE_RESTORE = 'true'
    DATABASE_DUMP_SHA256 = $dumpHash
  }
}

Run-OneOffTask @('npx', 'prisma', 'migrate', 'deploy')

if ($StartService) {
  $adminEmail = $env:LIEN_STAGING_ADMIN_EMAIL
  $adminPasswordHash = $env:LIEN_STAGING_ADMIN_PASSWORD_HASH
  if (-not $adminEmail -or -not $adminPasswordHash) {
    throw "Set LIEN_STAGING_ADMIN_EMAIL and LIEN_STAGING_ADMIN_PASSWORD_HASH before StartService."
  }
  $secretArn = Output-Value 'ApplicationSecretArn'
  $publicUrl = Output-Value 'LoadBalancerUrl'
  $secret = (& aws secretsmanager get-secret-value --secret-id $secretArn --profile $Profile --region $Region --query SecretString --output text --no-cli-pager | ConvertFrom-Json)
  $secret.ADMIN_EMAIL = $adminEmail
  $secret.ADMIN_PASSWORD_HASH = $adminPasswordHash
  $secret.APP_URL = $publicUrl
  $secretJson = $secret | ConvertTo-Json -Compress
  $secretPath = Join-Path ([IO.Path]::GetTempPath()) "lien-app-secret-$([Guid]::NewGuid().ToString('N')).json"
  [IO.File]::WriteAllText($secretPath, $secretJson, [Text.UTF8Encoding]::new($false))
  try {
    & aws secretsmanager put-secret-value --secret-id $secretArn --secret-string "file://$secretPath" --profile $Profile --region $Region --no-cli-pager | Out-Null
  } finally {
    Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue
  }
  if ($LASTEXITCODE -ne 0) { throw "Application secret update failed" }

  & npx.cmd cdk --app $app deploy SalonDeLien-staging @context -c desiredCount=1 --profile $Profile --require-approval never
  if ($LASTEXITCODE -ne 0) { throw "Service deployment failed" }
}

Write-Host "Staging migration preparation completed."
Write-Host "Image tag: $ImageTag"
Write-Host "Service started: $StartService"
if ($StartService) { Write-Host "Public URL: $(Output-Value 'LoadBalancerUrl')" }
