$ErrorActionPreference = 'Stop'

$Region = 'ap-northeast-1'
$AccountId = '009293460979'
$Repository = 'salon-de-lien-staging-app'
$Tag = 'shift-staff-identity-v389'
$Image = "$AccountId.dkr.ecr.$Region.amazonaws.com/${Repository}:$Tag"
$Cluster = 'salon-de-lien-staging-cluster'
$Service = 'salon-de-lien-staging-web'
$Family = 'salon-de-lien-staging-web'

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) { throw 'ECR login failed' }
docker build -f scripts/aws/runtime-patches/shift-staff-identity-v389/Dockerfile -t $Image .
if ($LASTEXITCODE -ne 0) { throw 'Docker build failed' }

$ExistingImage = aws ecr describe-images --repository-name $Repository --image-ids "imageTag=$Tag" --region $Region 2>$null
if ($LASTEXITCODE -ne 0) {
  docker push $Image
  if ($LASTEXITCODE -ne 0) { throw 'Docker push failed' }
}

$Current = aws ecs describe-task-definition --task-definition $Family --region $Region | ConvertFrom-Json
$Definition = $Current.taskDefinition
$Definition.containerDefinitions[0].image = $Image

$Payload = [ordered]@{
  family = $Definition.family
  taskRoleArn = $Definition.taskRoleArn
  executionRoleArn = $Definition.executionRoleArn
  networkMode = $Definition.networkMode
  containerDefinitions = $Definition.containerDefinitions
  volumes = $Definition.volumes
  placementConstraints = $Definition.placementConstraints
  requiresCompatibilities = $Definition.requiresCompatibilities
  cpu = $Definition.cpu
  memory = $Definition.memory
}
if ($null -ne $Definition.runtimePlatform) {
  $Payload.runtimePlatform = $Definition.runtimePlatform
}

$TaskFile = Join-Path $env:TEMP 'salon-de-lien-task-v389.json'
[System.IO.File]::WriteAllText(
  $TaskFile,
  ($Payload | ConvertTo-Json -Depth 100),
  (New-Object System.Text.UTF8Encoding($false))
)
$Registered = aws ecs register-task-definition --cli-input-json "file://$TaskFile" --region $Region | ConvertFrom-Json
$TaskArn = $Registered.taskDefinition.taskDefinitionArn
if (-not $TaskArn) { throw 'ECS task definition registration failed' }

aws ecs update-service --cluster $Cluster --service $Service --task-definition $TaskArn --force-new-deployment --region $Region | Out-Null
aws ecs wait services-stable --cluster $Cluster --services $Service --region $Region

Write-Output "Deployed $Image"
Write-Output "Task definition: $TaskArn"
