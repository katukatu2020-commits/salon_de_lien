$ErrorActionPreference = "Stop"

$region = "ap-northeast-1"
$accountId = "009293460979"
$repository = "salon-de-lien-staging-app"
$cluster = "salon-de-lien-staging-cluster"
$service = "salon-de-lien-staging-web"
$family = "salon-de-lien-staging-web"
$tag = "shift-day-navigation-v382"
$image = "$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$tag"
function Assert-ExternalSuccess([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" } }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repoRoot

$null = aws ecr describe-images --repository-name $repository --image-ids "imageTag=$tag" --region $region 2>$null
$imageExists = $LASTEXITCODE -eq 0
if ($imageExists) {
  Write-Output "Using existing immutable ECR image: $image"
} else {
  cmd /c "aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $accountId.dkr.ecr.$region.amazonaws.com"
  Assert-ExternalSuccess "ECR login"
  docker build --pull=false --build-arg BASE_IMAGE="$accountId.dkr.ecr.$region.amazonaws.com/${repository}:admin-image-crop-v381" -f "scripts/aws/runtime-patches/shift-day-navigation-v382/Dockerfile" -t $image .
  Assert-ExternalSuccess "Docker build"
  docker push $image
  Assert-ExternalSuccess "Docker push"
}

$currentTaskArn = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].taskDefinition" --output text
$task = aws ecs describe-task-definition --task-definition $currentTaskArn --region $region --query "taskDefinition" | ConvertFrom-Json
$task.containerDefinitions[0].image = $image
$registration = [ordered]@{
  family = $family
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
if ($task.runtimePlatform) { $registration.runtimePlatform = $task.runtimePlatform }
$taskFile = Join-Path $env:TEMP "salon-v382-task-definition.json"
[System.IO.File]::WriteAllText($taskFile, ($registration | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
$newTaskArn = aws ecs register-task-definition --cli-input-json "file://$taskFile" --region $region --query "taskDefinition.taskDefinitionArn" --output text
Assert-ExternalSuccess "Task definition registration"
aws ecs update-service --cluster $cluster --service $service --task-definition $newTaskArn --force-new-deployment --region $region | Out-Null
Assert-ExternalSuccess "ECS service update"
aws ecs wait services-stable --cluster $cluster --services $service --region $region
Assert-ExternalSuccess "ECS service stabilization"

$status = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].{taskDefinition:taskDefinition,running:runningCount,desired:desiredCount,rollout:deployments[0].rolloutState}" | ConvertFrom-Json
$status | ConvertTo-Json

$distributionId = "E23LI5IQDBD82Z"
$invalidation = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/admin/appointments*" "/_next/static/chunks/app/admin/appointments/*" --query "Invalidation.Id" --output text
Assert-ExternalSuccess "CloudFront invalidation creation"
aws cloudfront wait invalidation-completed --distribution-id $distributionId --id $invalidation
Assert-ExternalSuccess "CloudFront invalidation"
Write-Output "CloudFront invalidation completed: $invalidation"
