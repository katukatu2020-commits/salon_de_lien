param(
  [Parameter(Mandatory = $true)]
  [string]$Image,
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1",
  [string]$Cluster = "salon-de-lien-staging-cluster",
  [string]$Service = "salon-de-lien-staging-web"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli
Assert-LienApprovedAutomationContext -Action "AWS database migration image execution" -Profile $Profile -Region $Region

$profileArguments = @()
if ($Profile) { $profileArguments = @("--profile", $Profile) }

$serviceDefinition = (& aws ecs describe-services `
  --cluster $Cluster `
  --services $Service `
  @profileArguments `
  --region $Region `
  --query 'services[0].taskDefinition' `
  --output text `
  --no-cli-pager).Trim()

if (-not $serviceDefinition -or $serviceDefinition -eq "None") {
  throw "The current ECS task definition could not be resolved."
}

$taskDefinition = & aws ecs describe-task-definition `
  --task-definition $serviceDefinition `
  @profileArguments `
  --region $Region `
  --query taskDefinition `
  --output json `
  --no-cli-pager | ConvertFrom-Json

$taskDefinition.containerDefinitions[0].image = $Image
$registration = [ordered]@{
  family = $taskDefinition.family
  taskRoleArn = $taskDefinition.taskRoleArn
  executionRoleArn = $taskDefinition.executionRoleArn
  networkMode = $taskDefinition.networkMode
  containerDefinitions = $taskDefinition.containerDefinitions
  volumes = $taskDefinition.volumes
  requiresCompatibilities = $taskDefinition.requiresCompatibilities
  cpu = $taskDefinition.cpu
  memory = $taskDefinition.memory
}
if ($null -ne $taskDefinition.runtimePlatform) {
  $registration.runtimePlatform = $taskDefinition.runtimePlatform
}

$definitionPath = Join-Path ([IO.Path]::GetTempPath()) "lien-task-definition-$([Guid]::NewGuid().ToString('N')).json"
$overridePath = Join-Path ([IO.Path]::GetTempPath()) "lien-task-overrides-$([Guid]::NewGuid().ToString('N')).json"

try {
  [IO.File]::WriteAllText(
    $definitionPath,
    ($registration | ConvertTo-Json -Depth 100),
    [Text.UTF8Encoding]::new($false)
  )

  $migrationDefinition = (& aws ecs register-task-definition `
    --cli-input-json "file://$definitionPath" `
    @profileArguments `
    --region $Region `
    --query 'taskDefinition.taskDefinitionArn' `
    --output text `
    --no-cli-pager).Trim()

  if (-not $migrationDefinition -or $migrationDefinition -eq "None") {
    throw "The migration task definition could not be registered."
  }

  $networkConfigJson = (& aws ecs describe-services `
    --cluster $Cluster `
    --services $Service `
    @profileArguments `
    --region $Region `
    --query 'services[0].networkConfiguration.awsvpcConfiguration' `
    --output json `
    --no-cli-pager)
  $networkConfig = $networkConfigJson | ConvertFrom-Json

  $overrides = @{
    containerOverrides = @(
      @{
        name = "Web"
        command = @("npx", "prisma", "migrate", "deploy")
      }
    )
  }
  [IO.File]::WriteAllText(
    $overridePath,
    ($overrides | ConvertTo-Json -Depth 8 -Compress),
    [Text.UTF8Encoding]::new($false)
  )

  $subnets = $networkConfig.subnets -join ','
  $securityGroups = $networkConfig.securityGroups -join ','
  $assignPublicIp = $networkConfig.assignPublicIp
  $network = "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$securityGroups],assignPublicIp=$assignPublicIp}"

  $taskArn = (& aws ecs run-task `
    --cluster $Cluster `
    --task-definition $migrationDefinition `
    --launch-type FARGATE `
    --network-configuration $network `
    --overrides "file://$overridePath" `
    @profileArguments `
    --region $Region `
    --query 'tasks[0].taskArn' `
    --output text `
    --no-cli-pager).Trim()

  if (-not $taskArn -or $taskArn -eq "None") {
    throw "The migration task could not be started."
  }

  Write-Host "Migration task: $taskArn"
  & aws ecs wait tasks-stopped `
    --cluster $Cluster `
    --tasks $taskArn `
    @profileArguments `
    --region $Region

  $result = & aws ecs describe-tasks `
    --cluster $Cluster `
    --tasks $taskArn `
    @profileArguments `
    --region $Region `
    --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}' `
    --output json `
    --no-cli-pager | ConvertFrom-Json

  if ($result.exitCode -ne 0) {
    throw "Migration failed: $($result.reason)"
  }

  Write-Host "Migration completed with exit code 0."
  Write-Host "Task definition: $migrationDefinition"
} finally {
  Remove-Item -LiteralPath $definitionPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $overridePath -Force -ErrorAction SilentlyContinue
}
