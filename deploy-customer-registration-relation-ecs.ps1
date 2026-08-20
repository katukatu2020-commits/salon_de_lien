$ErrorActionPreference = 'Stop'

$region = 'ap-northeast-1'
$cluster = 'salon-de-lien-staging-cluster'
$service = 'salon-de-lien-staging-web'
$containerName = 'Web'
$image = '009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:customer-registration-relation-v306-20260820'
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$taskDefinitionPath = [System.IO.Path]::GetFullPath((Join-Path $tempRoot ("customer-registration-relation-task-definition-" + [guid]::NewGuid().ToString('N') + '.json')))

if (-not $taskDefinitionPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe temporary task definition path.'
}

try {
  $currentTaskDefinitionArn = aws ecs describe-services --region $region --cluster $cluster --services $service --query 'services[0].taskDefinition' --output text
  if ($LASTEXITCODE -ne 0 -or -not $currentTaskDefinitionArn) { throw 'Failed to resolve the current task definition.' }

  $current = (aws ecs describe-task-definition --region $region --task-definition $currentTaskDefinitionArn --output json) | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Failed to read the current task definition.' }
  $task = $current.taskDefinition
  $container = @($task.containerDefinitions | Where-Object { $_.name -eq $containerName })[0]
  if (-not $container) { throw "Container '$containerName' was not found." }
  $container.image = $image

  $registerInput = [ordered]@{
    family = $task.family
    taskRoleArn = $task.taskRoleArn
    executionRoleArn = $task.executionRoleArn
    networkMode = $task.networkMode
    containerDefinitions = $task.containerDefinitions
    volumes = $task.volumes
    placementConstraints = $task.placementConstraints
    requiresCompatibilities = $task.requiresCompatibilities
    cpu = $task.cpu
    memory = $task.memory
    runtimePlatform = $task.runtimePlatform
    ephemeralStorage = $task.ephemeralStorage
  }
  foreach ($key in @($registerInput.Keys)) { if ($null -eq $registerInput[$key]) { $registerInput.Remove($key) } }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($taskDefinitionPath, ($registerInput | ConvertTo-Json -Depth 100), $utf8NoBom)
  $newTaskDefinitionArn = aws ecs register-task-definition --region $region --cli-input-json ("file://" + $taskDefinitionPath) --query 'taskDefinition.taskDefinitionArn' --output text
  if ($LASTEXITCODE -ne 0 -or -not $newTaskDefinitionArn) { throw 'Failed to register the task definition.' }

  aws ecs update-service --region $region --cluster $cluster --service $service --task-definition $newTaskDefinitionArn --force-new-deployment --query 'service.taskDefinition' --output text
  if ($LASTEXITCODE -ne 0) { throw 'Failed to update the ECS service.' }
  Write-Output "Previous task definition: $currentTaskDefinitionArn"
  Write-Output "New task definition: $newTaskDefinitionArn"
}
finally {
  if ([System.IO.File]::Exists($taskDefinitionPath)) { [System.IO.File]::Delete($taskDefinitionPath) }
}
