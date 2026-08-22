$ErrorActionPreference = 'Stop'

$Region = 'ap-northeast-1'
$AccountId = '009293460979'
$Repository = "$AccountId.dkr.ecr.$Region.amazonaws.com/salon-de-lien-staging-app"
$ImageTag = 'shared-account-save-v368'
$Cluster = 'salon-de-lien-staging-cluster'
$Service = 'salon-de-lien-staging-web'

$ExistingImage = aws ecr describe-images --region $Region --repository-name 'salon-de-lien-staging-app' --image-ids "imageTag=$ImageTag" --query 'imageDetails[0].imageDigest' --output text 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ExistingImage) -or $ExistingImage -eq 'None') {
  docker build --provenance=false --file scripts/aws/runtime-patches/shared-account-save-v368/Dockerfile --tag "${Repository}:${ImageTag}" .
  if ($LASTEXITCODE -ne 0) { throw 'docker build failed' }

  docker push "${Repository}:${ImageTag}"
  if ($LASTEXITCODE -ne 0) { throw 'docker push failed' }
} else {
  Write-Host "Using existing immutable image ${Repository}:${ImageTag} (${ExistingImage})"
}

$CurrentTaskDefinition = aws ecs describe-services --region $Region --cluster $Cluster --services $Service --query 'services[0].taskDefinition' --output text
$Task = aws ecs describe-task-definition --region $Region --task-definition $CurrentTaskDefinition --query 'taskDefinition' | ConvertFrom-Json
$Task.containerDefinitions[0].image = "${Repository}:${ImageTag}"
$Registration = [ordered]@{
  family = $Task.family
  taskRoleArn = $Task.taskRoleArn
  executionRoleArn = $Task.executionRoleArn
  networkMode = $Task.networkMode
  containerDefinitions = $Task.containerDefinitions
  volumes = $Task.volumes
  placementConstraints = $Task.placementConstraints
  requiresCompatibilities = $Task.requiresCompatibilities
  cpu = $Task.cpu
  memory = $Task.memory
}
if ($null -ne $Task.runtimePlatform) { $Registration.runtimePlatform = $Task.runtimePlatform }
$JsonPath = Join-Path $env:TEMP 'salon-task-v368.json'
$Json = $Registration | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($JsonPath, $Json, [System.Text.UTF8Encoding]::new($false))
$NewTaskDefinition = aws ecs register-task-definition --region $Region --cli-input-json "file://$JsonPath" --query 'taskDefinition.taskDefinitionArn' --output text
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($NewTaskDefinition)) { throw 'task definition registration failed' }
aws ecs update-service --region $Region --cluster $Cluster --service $Service --task-definition $NewTaskDefinition --force-new-deployment | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'ECS service update failed' }
aws ecs wait services-stable --region $Region --cluster $Cluster --services $Service
if ($LASTEXITCODE -ne 0) { throw 'ECS service did not stabilize' }

Write-Host "Deployed ${Repository}:${ImageTag} with $NewTaskDefinition"
