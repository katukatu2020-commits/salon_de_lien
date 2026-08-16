param(
  [Parameter(Mandatory = $true)]
  [string]$PreviousTaskDefinitionArn,
  [Parameter(Mandatory = $true)]
  [string]$PreviousImage,
  [Parameter(Mandatory = $true)]
  [string]$PreviousImageDigest,
  [Parameter(Mandatory = $true)]
  [string]$NewTaskDefinitionArn,
  [Parameter(Mandatory = $true)]
  [string]$NewImage,
  [Parameter(Mandatory = $true)]
  [string]$NewImageDigest,
  [string]$Profile = "",
  [string]$Region = "ap-northeast-1",
  [string]$ClusterName = "salon-de-lien-staging-cluster",
  [string]$ServiceName = "salon-de-lien-staging-web",
  [string]$ContainerName = "Web",
  [string]$RepositoryName = "salon-de-lien-staging-app",
  [string]$ProtectionStackName = "SalonDeLienDeploymentProtection-staging"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Assert-LienApprovedAutomationContext `
  -Action "protected ECS release" `
  -Profile $Profile `
  -Region $Region

$lockedPolicyPath = Join-Path $repoRoot "infrastructure/deployment-protection/locked-stack-policy.json"
$allowPolicyPath = Join-Path ([IO.Path]::GetTempPath()) "lien-release-stack-policy-$([Guid]::NewGuid().ToString('N')).json"
$profileArguments = @()
if ($Profile) { $profileArguments = @("--profile", $Profile) }

function Invoke-AwsChecked {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & aws @Arguments @profileArguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS command failed: aws $($Arguments -join ' ')"
  }
}

function Set-ApprovedRelease {
  param(
    [string]$TaskDefinitionArn,
    [string]$Image,
    [string]$ImageDigest
  )

  Invoke-AwsChecked cloudformation set-stack-policy `
    --stack-name $ProtectionStackName `
    --stack-policy-body "file://$allowPolicyPath" `
    --region $Region `
    --no-cli-pager
  try {
    $parameters = @(
      "ParameterKey=ClusterName,UsePreviousValue=true",
      "ParameterKey=ServiceName,UsePreviousValue=true",
      "ParameterKey=ContainerName,UsePreviousValue=true",
      "ParameterKey=ApprovedTaskDefinitionArn,ParameterValue=$TaskDefinitionArn",
      "ParameterKey=ApprovedImage,ParameterValue=$Image",
      "ParameterKey=ApprovedImageDigest,ParameterValue=$ImageDigest",
      "ParameterKey=EcrRepositoryName,UsePreviousValue=true",
      "ParameterKey=ApprovedDesiredCount,UsePreviousValue=true"
    )
    Invoke-AwsChecked cloudformation update-stack `
      --stack-name $ProtectionStackName `
      --use-previous-template `
      --capabilities CAPABILITY_NAMED_IAM `
      --parameters @parameters `
      --region $Region `
      --no-cli-pager
    Invoke-AwsChecked cloudformation wait stack-update-complete `
      --stack-name $ProtectionStackName `
      --region $Region `
      --no-cli-pager
  } finally {
    Invoke-AwsChecked cloudformation set-stack-policy `
      --stack-name $ProtectionStackName `
      --stack-policy-body "file://$lockedPolicyPath" `
      --region $Region `
      --no-cli-pager
  }
}

$allowPolicy = @{
  Statement = @(
    @{
      Effect = "Allow"
      Action = "Update:*"
      Principal = "*"
      Resource = "*"
    }
  )
} | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText($allowPolicyPath, $allowPolicy, [Text.UTF8Encoding]::new($false))

try {
  $service = (& aws ecs describe-services `
    --cluster $ClusterName `
    --services $ServiceName `
    @profileArguments `
    --region $Region `
    --query "services[0]" `
    --output json `
    --no-cli-pager | ConvertFrom-Json)
  if ($LASTEXITCODE -ne 0 -or $service.taskDefinition -ne $PreviousTaskDefinitionArn) {
    throw "The ECS service is not on the expected previous task definition."
  }

  $newTaskImage = (& aws ecs describe-task-definition `
    --task-definition $NewTaskDefinitionArn `
    @profileArguments `
    --region $Region `
    --query "taskDefinition.containerDefinitions[?name=='$ContainerName'].image | [0]" `
    --output text `
    --no-cli-pager).Trim()
  if ($LASTEXITCODE -ne 0 -or $newTaskImage -ne $NewImage) {
    throw "The new task definition does not reference the expected image."
  }

  $newTag = $NewImage.Substring($NewImage.LastIndexOf(":") + 1)
  $resolvedDigest = (& aws ecr describe-images `
    --repository-name $RepositoryName `
    --image-ids "imageTag=$newTag" `
    @profileArguments `
    --region $Region `
    --query "imageDetails[0].imageDigest" `
    --output text `
    --no-cli-pager).Trim()
  if ($LASTEXITCODE -ne 0 -or $resolvedDigest -ne $NewImageDigest) {
    throw "The new ECR tag does not resolve to the expected digest."
  }

  Set-ApprovedRelease `
    -TaskDefinitionArn $NewTaskDefinitionArn `
    -Image $NewImage `
    -ImageDigest $NewImageDigest

  try {
    Invoke-AwsChecked ecs update-service `
      --cluster $ClusterName `
      --service $ServiceName `
      --task-definition $NewTaskDefinitionArn `
      --force-new-deployment `
      --region $Region `
      --no-cli-pager
    Invoke-AwsChecked ecs wait services-stable `
      --cluster $ClusterName `
      --services $ServiceName `
      --region $Region `
      --no-cli-pager
  } catch {
    Set-ApprovedRelease `
      -TaskDefinitionArn $PreviousTaskDefinitionArn `
      -Image $PreviousImage `
      -ImageDigest $PreviousImageDigest
    Invoke-AwsChecked ecs update-service `
      --cluster $ClusterName `
      --service $ServiceName `
      --task-definition $PreviousTaskDefinitionArn `
      --force-new-deployment `
      --region $Region `
      --no-cli-pager
    Invoke-AwsChecked ecs wait services-stable `
      --cluster $ClusterName `
      --services $ServiceName `
      --region $Region `
      --no-cli-pager
    throw
  }

  $deployedTask = (& aws ecs describe-services `
    --cluster $ClusterName `
    --services $ServiceName `
    @profileArguments `
    --region $Region `
    --query "services[0].taskDefinition" `
    --output text `
    --no-cli-pager).Trim()
  if ($deployedTask -ne $NewTaskDefinitionArn) {
    throw "The ECS service did not settle on the approved task definition."
  }
  Write-Output $deployedTask
} finally {
  Remove-Item -LiteralPath $allowPolicyPath -Force -ErrorAction SilentlyContinue
}
