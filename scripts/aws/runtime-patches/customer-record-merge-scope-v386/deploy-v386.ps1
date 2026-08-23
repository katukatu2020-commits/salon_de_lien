$ErrorActionPreference = "Stop"

$region = "ap-northeast-1"
$accountId = "009293460979"
$repository = "salon-de-lien-staging-app"
$cluster = "salon-de-lien-staging-cluster"
$service = "salon-de-lien-staging-web"
$family = "salon-de-lien-staging-web"
$baseTag = "customer-record-merge-v385"
$tag = "customer-record-merge-scope-v386"
$image = "$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$tag"
function Assert-ExternalSuccess([string]$step) { if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" } }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repoRoot

cmd /c "aws ecr describe-images --repository-name $repository --image-ids imageTag=$tag --region $region >nul 2>nul"
$imageExists = $LASTEXITCODE -eq 0
if (-not $imageExists) {
  cmd /c "aws ecr get-login-password --region $region | docker login --username AWS --password-stdin $accountId.dkr.ecr.$region.amazonaws.com"
  Assert-ExternalSuccess "ECR login"
  docker build --pull=false --build-arg BASE_IMAGE="$accountId.dkr.ecr.$region.amazonaws.com/${repository}:$baseTag" -f "scripts/aws/runtime-patches/customer-record-merge-scope-v386/Dockerfile" -t $image .
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
$taskFile = Join-Path $env:TEMP "salon-v386-task-definition.json"
[System.IO.File]::WriteAllText($taskFile, ($registration | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
$newTaskArn = aws ecs register-task-definition --cli-input-json "file://$taskFile" --region $region --query "taskDefinition.taskDefinitionArn" --output text
Assert-ExternalSuccess "Task definition registration"
aws ecs update-service --cluster $cluster --service $service --task-definition $newTaskArn --force-new-deployment --region $region | Out-Null
Assert-ExternalSuccess "ECS service update"
aws ecs wait services-stable --cluster $cluster --services $service --region $region
Assert-ExternalSuccess "ECS service stabilization"

$distributionId = "E23LI5IQDBD82Z"
$invalidation = aws cloudfront create-invalidation --distribution-id $distributionId --paths "/admin/*" "/tenant-setup-client.js" "/customer-merge-v385.js*" --query "Invalidation.Id" --output text
Assert-ExternalSuccess "CloudFront invalidation creation"
aws cloudfront wait invalidation-completed --distribution-id $distributionId --id $invalidation
Assert-ExternalSuccess "CloudFront invalidation"

$status = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].{taskDefinition:taskDefinition,running:runningCount,desired:desiredCount,rollout:deployments[0].rolloutState}" | ConvertFrom-Json
$status | ConvertTo-Json
Write-Output "CloudFront invalidation completed: $invalidation"

