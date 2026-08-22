$ErrorActionPreference = 'Stop'

$region = 'ap-northeast-1'
$accountId = '009293460979'
$repository = 'salon-de-lien-staging-app'
$tag = 'free-pool-capacity-v372'
$image = "$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$tag"
$cluster = 'salon-de-lien-staging-cluster'
$service = 'salon-de-lien-staging-web'
$family = 'salon-de-lien-staging-web'

aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$region.amazonaws.com"
docker build --pull=false -f scripts/aws/runtime-patches/free-pool-capacity-v372/Dockerfile -t $image .
docker push $image

$current = aws ecs describe-task-definition --region $region --task-definition $family | ConvertFrom-Json
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
  runtimePlatform = $definition.runtimePlatform
}
$taskFile = Join-Path $env:TEMP 'salon-de-lien-task-v372.json'
$payload | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $taskFile -Encoding utf8
$registered = aws ecs register-task-definition --region $region --cli-input-json "file://$taskFile" | ConvertFrom-Json
$taskDefinitionArn = $registered.taskDefinition.taskDefinitionArn
aws ecs update-service --region $region --cluster $cluster --service $service --task-definition $taskDefinitionArn --force-new-deployment | Out-Null
aws ecs wait services-stable --region $region --cluster $cluster --services $service
Write-Output "Deployed $taskDefinitionArn with $image"
