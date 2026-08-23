$ErrorActionPreference = 'Stop'

$Region = 'ap-northeast-1'
$AccountId = '009293460979'
$Repository = 'salon-de-lien-staging-app'
$Tag = 'shift-staff-drop-v394'
$Image = "$AccountId.dkr.ecr.$Region.amazonaws.com/${Repository}:$Tag"
$Cluster = 'salon-de-lien-staging-cluster'
$Service = 'salon-de-lien-staging-web'
$Family = 'salon-de-lien-staging-web'

$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$DockerConfig = $null
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry
if ($LASTEXITCODE -ne 0) {
  $Authorization = aws ecr get-authorization-token --region $Region | ConvertFrom-Json
  $Token = $Authorization.authorizationData[0].authorizationToken
  if (-not $Token) { throw 'ECR authorization token was not returned' }
  $DockerConfig = Join-Path $env:TEMP ("salon-ecr-v394-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $DockerConfig | Out-Null
  $DockerAuth = @{ auths = @{ $Registry = @{ auth = $Token } } } | ConvertTo-Json -Depth 5 -Compress
  [System.IO.File]::WriteAllText(
    (Join-Path $DockerConfig 'config.json'),
    $DockerAuth,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

docker build -f scripts/aws/runtime-patches/shift-staff-drop-v394/Dockerfile -t $Image .
if ($LASTEXITCODE -ne 0) { throw 'Docker build failed' }

try {
  if ($DockerConfig) { docker --config $DockerConfig push $Image } else { docker push $Image }
  if ($LASTEXITCODE -ne 0) { throw 'Docker push failed' }
} finally {
  if ($DockerConfig -and (Test-Path -LiteralPath $DockerConfig)) {
    Remove-Item -LiteralPath $DockerConfig -Recurse -Force
  }
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
if ($null -ne $Definition.runtimePlatform) { $Payload.runtimePlatform = $Definition.runtimePlatform }

$TaskFile = Join-Path $env:TEMP 'salon-de-lien-task-v394.json'
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
