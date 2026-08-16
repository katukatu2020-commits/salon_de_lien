param(
  [Parameter(Mandatory = $true)]
  [string]$CurrentTaskDefinition,
  [Parameter(Mandatory = $true)]
  [string]$Image,
  [string]$Region = "ap-northeast-1",
  [string]$ContainerName = "Web"
)

$ErrorActionPreference = "Stop"

$taskDefinition = (& aws ecs describe-task-definition `
  --task-definition $CurrentTaskDefinition `
  --region $Region `
  --query taskDefinition `
  --output json `
  --no-cli-pager | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or -not $taskDefinition) {
  throw "The current task definition could not be read."
}

$container = $taskDefinition.containerDefinitions |
  Where-Object { $_.name -eq $ContainerName } |
  Select-Object -First 1
if (-not $container) {
  throw "Container '$ContainerName' was not found."
}
$container.image = $Image

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

$payloadPath = Join-Path $env:TEMP "lien-admin-service-brand-task.json"
try {
  [IO.File]::WriteAllText(
    $payloadPath,
    ($payload | ConvertTo-Json -Depth 100 -Compress),
    [Text.UTF8Encoding]::new($false)
  )
  $newTaskArn = (& aws ecs register-task-definition `
    --cli-input-json "file://$payloadPath" `
    --region $Region `
    --query taskDefinition.taskDefinitionArn `
    --output text `
    --no-cli-pager).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $newTaskArn -or $newTaskArn -eq "None") {
    throw "Task definition registration failed."
  }
  Write-Output $newTaskArn
} finally {
  Remove-Item -LiteralPath $payloadPath -Force -ErrorAction SilentlyContinue
}
