$ErrorActionPreference = 'Stop'

$Region = 'ap-northeast-1'
$AccountId = '009293460979'
$Repository = "$AccountId.dkr.ecr.$Region.amazonaws.com/salon-de-lien-staging-app"
$ImageTag = 'shared-account-save-v368'
$Cluster = 'salon-de-lien-staging-cluster'
$Service = 'salon-de-lien-staging-web'

docker build --file scripts/aws/runtime-patches/shared-account-save-v368/Dockerfile --tag "${Repository}:${ImageTag}" .
if ($LASTEXITCODE -ne 0) { throw 'docker build failed' }

docker push "${Repository}:${ImageTag}"
if ($LASTEXITCODE -ne 0) { throw 'docker push failed' }

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
  runtimePlatform = $Task.runtimePlatform
}
$JsonPath = Join-Path $env:TEMP 'salon-task-v368.json'
$Registration | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 $JsonPath
$NewTaskDefinition = aws ecs register-task-definition --region $Region --cli-input-json "file://$JsonPath" --query 'taskDefinition.taskDefinitionArn' --output text
aws ecs update-service --region $Region --cluster $Cluster --service $Service --task-definition $NewTaskDefinition --force-new-deployment | Out-Null
aws ecs wait services-stable --region $Region --cluster $Cluster --services $Service

Write-Host "Deployed ${Repository}:${ImageTag} with $NewTaskDefinition"
