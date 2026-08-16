param(
  [Parameter(Mandatory = $true)]
  [string]$CurrentTaskDefinition,
  [Parameter(Mandatory = $true)]
  [string]$Image,
  [string]$Profile = "",
  [string]$Region = "ap-northeast-1",
  [string]$ContainerName = "Web"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Assert-LienApprovedAutomationContext `
  -Action "ECS release task registration" `
  -Profile $Profile `
  -Region $Region

$profileArguments = @()
if ($Profile) { $profileArguments = @("--profile", $Profile) }

$taskDefinition = (& aws ecs describe-task-definition `
  --task-definition $CurrentTaskDefinition `
  @profileArguments `
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

$payloadPath = Join-Path ([IO.Path]::GetTempPath()) "lien-release-task-$([Guid]::NewGuid().ToString('N')).json"
try {
  [IO.File]::WriteAllText(
    $payloadPath,
    ($payload | ConvertTo-Json -Depth 100 -Compress),
    [Text.UTF8Encoding]::new($false)
  )
  $newTaskArn = (& aws ecs register-task-definition `
    --cli-input-json "file://$payloadPath" `
    @profileArguments `
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
