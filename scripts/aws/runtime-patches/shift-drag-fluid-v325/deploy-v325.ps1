param(
  [string]$Region = 'ap-northeast-1',
  [string]$Cluster = 'salon-de-lien-staging-cluster',
  [string]$Service = 'salon-de-lien-staging-web',
  [string]$SourceTaskDefinition = 'salon-de-lien-staging-web:324',
  [string]$Image = '009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app:shift-drag-fluid-v325'
)

$ErrorActionPreference = 'Stop'
$task = (aws ecs describe-task-definition --task-definition $SourceTaskDefinition --region $Region | ConvertFrom-Json).taskDefinition
$task.containerDefinitions[0].image = $Image
$input = [ordered]@{
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
}
if ($null -ne $task.runtimePlatform) { $input.runtimePlatform = $task.runtimePlatform }

$temporaryPath = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($temporaryPath, ($input | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
  $registered = aws ecs register-task-definition --cli-input-json "file://$temporaryPath" --region $Region | ConvertFrom-Json
  $taskDefinitionArn = $registered.taskDefinition.taskDefinitionArn
  if (-not $taskDefinitionArn) { throw 'ECS task definition registration failed.' }
  aws ecs update-service --cluster $Cluster --service $Service --task-definition $taskDefinitionArn --force-new-deployment --region $Region | Out-Null
  Write-Output $taskDefinitionArn
} finally {
  Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
}
