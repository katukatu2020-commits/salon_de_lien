param(
  [Parameter(Mandatory = $true)]
  [string]$Image,
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$Cluster = "salon-de-lien-staging-cluster",
  [string]$Service = "salon-de-lien-staging-web",
  [switch]$Migrate
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli
Assert-LienApprovedAutomationContext -Action "ECS image deployment" -Profile $Profile -Region $Region

$currentArn = (& aws ecs describe-services `
  --cluster $Cluster `
  --services $Service `
  --profile $Profile `
  --region $Region `
  --query "services[0].taskDefinition" `
  --output text `
  --no-cli-pager).Trim()

$taskDefinition = (& aws ecs describe-task-definition `
  --task-definition $currentArn `
  --profile $Profile `
  --region $Region `
  --query taskDefinition `
  --output json `
  --no-cli-pager | ConvertFrom-Json)

foreach ($container in $taskDefinition.containerDefinitions) {
  if ($container.name -eq "Web") {
    $container.image = $Image
  }
}

$payload = [ordered]@{
  family                  = $taskDefinition.family
  taskRoleArn             = $taskDefinition.taskRoleArn
  executionRoleArn        = $taskDefinition.executionRoleArn
  networkMode             = $taskDefinition.networkMode
  containerDefinitions    = $taskDefinition.containerDefinitions
  volumes                 = $taskDefinition.volumes
  placementConstraints    = $taskDefinition.placementConstraints
  requiresCompatibilities = $taskDefinition.requiresCompatibilities
  cpu                     = $taskDefinition.cpu
  memory                  = $taskDefinition.memory
}

if ($taskDefinition.runtimePlatform) {
  $payload.runtimePlatform = $taskDefinition.runtimePlatform
}

if ($taskDefinition.ephemeralStorage) {
  $payload.ephemeralStorage = $taskDefinition.ephemeralStorage
}

$payloadPath = Join-Path $env:TEMP "lien-task-definition-image-update.json"
[IO.File]::WriteAllText(
  $payloadPath,
  ($payload | ConvertTo-Json -Depth 100 -Compress),
  [Text.UTF8Encoding]::new($false)
)

$newArn = (& aws ecs register-task-definition `
  --cli-input-json "file://$payloadPath" `
  --profile $Profile `
  --region $Region `
  --query "taskDefinition.taskDefinitionArn" `
  --output text `
  --no-cli-pager).Trim()

if (-not $newArn) {
  throw "Task definition registration failed."
}

if ($Migrate) {
  $serviceDescription = (& aws ecs describe-services `
    --cluster $Cluster `
    --services $Service `
    --profile $Profile `
    --region $Region `
    --query "services[0]" `
    --output json `
    --no-cli-pager | ConvertFrom-Json)
  $networkPath = Join-Path $env:TEMP "lien-migration-network.json"
  $overridesPath = Join-Path $env:TEMP "lien-migration-overrides.json"
  [IO.File]::WriteAllText($networkPath, ($serviceDescription.networkConfiguration | ConvertTo-Json -Depth 20 -Compress), [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText(
    $overridesPath,
    (@{ containerOverrides = @(@{ name = "Web"; command = @("npx", "prisma", "migrate", "deploy") }) } | ConvertTo-Json -Depth 20 -Compress),
    [Text.UTF8Encoding]::new($false)
  )
  try {
    $migrationTaskArn = (& aws ecs run-task `
      --cluster $Cluster `
      --task-definition $newArn `
      --launch-type FARGATE `
      --network-configuration "file://$networkPath" `
      --overrides "file://$overridesPath" `
      --profile $Profile `
      --region $Region `
      --query "tasks[0].taskArn" `
      --output text `
      --no-cli-pager).Trim()
    if (-not $migrationTaskArn -or $migrationTaskArn -eq "None") {
      throw "Migration task failed to start."
    }
    & aws ecs wait tasks-stopped --cluster $Cluster --tasks $migrationTaskArn --profile $Profile --region $Region
    $migrationResult = (& aws ecs describe-tasks `
      --cluster $Cluster `
      --tasks $migrationTaskArn `
      --profile $Profile `
      --region $Region `
      --query "tasks[0].containers[0].{exitCode:exitCode,reason:reason}" `
      --output json `
      --no-cli-pager | ConvertFrom-Json)
    if ($migrationResult.exitCode -ne 0) {
      throw "Migration task failed: $($migrationResult.reason)"
    }
  } finally {
    Remove-Item -LiteralPath $networkPath,$overridesPath -Force -ErrorAction SilentlyContinue
  }
}

& aws ecs update-service `
  --cluster $Cluster `
  --service $Service `
  --task-definition $newArn `
  --force-new-deployment `
  --profile $Profile `
  --region $Region `
  --no-cli-pager | Out-Null

& aws ecs wait services-stable `
  --cluster $Cluster `
  --services $Service `
  --profile $Profile `
  --region $Region

Write-Output $newArn
