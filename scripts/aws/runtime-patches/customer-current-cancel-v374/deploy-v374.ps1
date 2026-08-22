$ErrorActionPreference = 'Stop'

$region = 'ap-northeast-1'
$accountId = '009293460979'
$repository = 'salon-de-lien-staging-app'
$tag = 'customer-current-cancel-v374'
$image = "$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$tag"
$cluster = 'salon-de-lien-staging-cluster'
$service = 'salon-de-lien-staging-web'
$family = 'salon-de-lien-staging-web'

function Assert-ExternalSuccess([string]$step) {
  if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" }
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$existingImageJson = aws ecr describe-images --region $region --repository-name $repository --image-ids "imageTag=$tag" 2>$null
$imageLookupExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$existingImage = if ($imageLookupExitCode -eq 0 -and $existingImageJson) { $existingImageJson | ConvertFrom-Json } else { $null }
if (-not $existingImage.imageDetails) {
  cmd /c "aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $accountId.dkr.ecr.$region.amazonaws.com"
  Assert-ExternalSuccess 'ECR login'
  docker build --pull=false -f scripts/aws/runtime-patches/customer-current-cancel-v374/Dockerfile -t $image .
  Assert-ExternalSuccess 'Docker build'
  docker push $image
  Assert-ExternalSuccess 'Docker push'
} else {
  Write-Output "Using existing immutable image $image"
}

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
$taskFile = Join-Path $env:TEMP 'salon-de-lien-task-v374.json'
[System.IO.File]::WriteAllText($taskFile, ($payload | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
$registered = aws ecs register-task-definition --region $region --cli-input-json "file://$taskFile" | ConvertFrom-Json
Assert-ExternalSuccess 'Task definition registration'
$taskDefinitionArn = $registered.taskDefinition.taskDefinitionArn
if (-not $taskDefinitionArn) { throw 'Task definition registration returned no ARN' }
aws ecs update-service --region $region --cluster $cluster --service $service --task-definition $taskDefinitionArn --force-new-deployment | Out-Null
Assert-ExternalSuccess 'ECS service update'
aws ecs wait services-stable --region $region --cluster $cluster --services $service
Assert-ExternalSuccess 'ECS stability wait'
Write-Output "Deployed $taskDefinitionArn with $image"
