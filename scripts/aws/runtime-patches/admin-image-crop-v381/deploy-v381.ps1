$ErrorActionPreference = 'Stop'
$region = 'ap-northeast-1'
$accountId = '009293460979'
$repository = 'salon-de-lien-staging-app'
$tag = 'admin-image-crop-v381'
$image = "$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$tag"
$cluster = 'salon-de-lien-staging-cluster'
$service = 'salon-de-lien-staging-web'
$family = 'salon-de-lien-staging-web'
function Assert-ExternalSuccess([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" } }

cmd /c "aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $accountId.dkr.ecr.$region.amazonaws.com"
Assert-ExternalSuccess 'ECR login'
docker build --pull=false -f scripts/aws/runtime-patches/admin-image-crop-v381/Dockerfile -t $image .
Assert-ExternalSuccess 'Docker build'
docker push $image
Assert-ExternalSuccess 'Docker push'

$current = aws ecs describe-task-definition --region $region --task-definition $family | ConvertFrom-Json
Assert-ExternalSuccess 'Current task definition lookup'
$definition = $current.taskDefinition
$containerDefinitions = $definition.containerDefinitions
$containerDefinitions[0].image = $image
$payload = [ordered]@{
  family = $definition.family
  taskRoleArn = $definition.taskRoleArn
  executionRoleArn = $definition.executionRoleArn
  networkMode = $definition.networkMode
  containerDefinitions = $containerDefinitions
  volumes = $definition.volumes
  placementConstraints = $definition.placementConstraints
  requiresCompatibilities = $definition.requiresCompatibilities
  cpu = $definition.cpu
  memory = $definition.memory
}
if ($definition.runtimePlatform) { $payload.runtimePlatform = $definition.runtimePlatform }
$taskFile = Join-Path $env:TEMP 'salon-de-lien-task-v381.json'
[System.IO.File]::WriteAllText($taskFile, ($payload | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
$registered = aws ecs register-task-definition --region $region --cli-input-json "file://$taskFile" | ConvertFrom-Json
Assert-ExternalSuccess 'Task definition registration'
$taskDefinitionArn = $registered.taskDefinition.taskDefinitionArn
aws ecs update-service --region $region --cluster $cluster --service $service --task-definition $taskDefinitionArn --force-new-deployment | Out-Null
Assert-ExternalSuccess 'ECS service update'
Write-Output "Deployment started: $taskDefinitionArn with $image"
