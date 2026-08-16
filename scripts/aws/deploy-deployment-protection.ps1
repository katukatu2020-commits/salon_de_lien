param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$LockPath = "",
  [switch]$SkipApplicationStackLock
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli

$lock = Get-LienDeploymentLock -LockPath $LockPath
$region = [string]$lock.region
$profileArguments = @()
if ($Profile) { $profileArguments = @("--profile", $Profile) }

$identity = & aws sts get-caller-identity @profileArguments --region $region --output json --no-cli-pager | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $identity.Account -ne $lock.accountId) {
  throw "The authenticated AWS account does not match the deployment lock."
}

$service = & aws ecs describe-services `
  --cluster $lock.clusterName `
  --services $lock.serviceName `
  @profileArguments `
  --region $region `
  --query "services[0]" `
  --output json `
  --no-cli-pager | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $service) { throw "Protected ECS service was not found." }
if ($service.taskDefinition -ne $lock.taskDefinitionArn -or $service.desiredCount -ne $lock.desiredCount) {
  throw "Refusing to lock an unexpected ECS state. Restore the approved task first."
}

$taskImage = (& aws ecs describe-task-definition `
  --task-definition $lock.taskDefinitionArn `
  @profileArguments `
  --region $region `
  --query "taskDefinition.containerDefinitions[?name=='$($lock.containerName)'].image | [0]" `
  --output text `
  --no-cli-pager).Trim()
if ($taskImage -ne $lock.imageUri) {
  throw "The approved task definition does not reference the locked image."
}

$imageDigest = (& aws ecr describe-images `
  --repository-name $lock.ecrRepositoryName `
  --image-ids "imageTag=$($lock.imageUri.Substring($lock.imageUri.LastIndexOf(':') + 1))" `
  @profileArguments `
  --region $region `
  --query "imageDetails[0].imageDigest" `
  --output text `
  --no-cli-pager).Trim()
if ($imageDigest -ne $lock.imageDigest) {
  throw "The approved ECR tag does not resolve to the locked digest."
}

$templatePath = Join-Path $repoRoot "infrastructure/deployment-protection/template.yaml"
$existingProtectionStack = $null
try {
  $existingProtectionStack = & aws cloudformation describe-stacks `
    --stack-name $lock.protectionStackName `
    @profileArguments `
    --region $region `
    --query "Stacks[0]" `
    --output json `
    --no-cli-pager 2>$null | ConvertFrom-Json
} catch {
  $existingProtectionStack = $null
}

if ($existingProtectionStack) {
  $lockedTaskOutput = $existingProtectionStack.Outputs | Where-Object { $_.OutputKey -eq "ApprovedTaskDefinitionArn" } | Select-Object -First 1
  if ($lockedTaskOutput.OutputValue -ne $lock.taskDefinitionArn) {
    throw "The existing protection stack is locked to a different release. Use the reviewed release procedure."
  }
} else {
  & aws cloudformation deploy `
    --stack-name $lock.protectionStackName `
    --template-file $templatePath `
    --capabilities CAPABILITY_NAMED_IAM `
    --no-fail-on-empty-changeset `
    --parameter-overrides `
      "ClusterName=$($lock.clusterName)" `
      "ServiceName=$($lock.serviceName)" `
      "ContainerName=$($lock.containerName)" `
      "ApprovedTaskDefinitionArn=$($lock.taskDefinitionArn)" `
      "ApprovedImage=$($lock.imageUri)" `
      "ApprovedImageDigest=$($lock.imageDigest)" `
      "EcrRepositoryName=$($lock.ecrRepositoryName)" `
      "ApprovedDesiredCount=$($lock.desiredCount)" `
    @profileArguments `
    --region $region `
    --no-cli-pager
  if ($LASTEXITCODE -ne 0) { throw "Deployment protection stack failed." }
}

$stackPolicyPath = Join-Path $repoRoot "infrastructure/deployment-protection/locked-stack-policy.json"
& aws cloudformation update-termination-protection `
  --stack-name $lock.protectionStackName `
  --enable-termination-protection `
  @profileArguments `
  --region $region `
  --no-cli-pager | Out-Null
& aws cloudformation set-stack-policy `
  --stack-name $lock.protectionStackName `
  --stack-policy-body "file://$stackPolicyPath" `
  @profileArguments `
  --region $region `
  --no-cli-pager

if (-not $SkipApplicationStackLock) {
  & aws cloudformation update-termination-protection `
    --stack-name $lock.applicationStackName `
    --enable-termination-protection `
    @profileArguments `
    --region $region `
    --no-cli-pager | Out-Null
  & aws cloudformation set-stack-policy `
    --stack-name $lock.applicationStackName `
    --stack-policy-body "file://$stackPolicyPath" `
    @profileArguments `
    --region $region `
    --no-cli-pager
}

& aws ecr put-image-tag-mutability `
  --repository-name $lock.ecrRepositoryName `
  --image-tag-mutability IMMUTABLE `
  @profileArguments `
  --region $region `
  --no-cli-pager | Out-Null

$hasLifecyclePolicy = $false
try {
  & aws ecr get-lifecycle-policy `
    --repository-name $lock.ecrRepositoryName `
    @profileArguments `
    --region $region `
    --no-cli-pager 2>$null | Out-Null
  $hasLifecyclePolicy = $LASTEXITCODE -eq 0
} catch {
  $hasLifecyclePolicy = $false
}
if ($hasLifecyclePolicy) {
  & aws ecr delete-lifecycle-policy `
    --repository-name $lock.ecrRepositoryName `
    @profileArguments `
    --region $region `
    --no-cli-pager | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "ECR lifecycle deletion could not be disabled." }
}

$repositoryPolicyPath = Join-Path $repoRoot "infrastructure/deployment-protection/ecr-delete-protection-policy.json"
& aws ecr set-repository-policy `
  --repository-name $lock.ecrRepositoryName `
  --policy-text "file://$repositoryPolicyPath" `
  @profileArguments `
  --region $region `
  --no-cli-pager | Out-Null
if ($LASTEXITCODE -ne 0) { throw "ECR delete protection could not be applied." }

$functionName = (& aws cloudformation describe-stacks `
  --stack-name $lock.protectionStackName `
  @profileArguments `
  --region $region `
  --query "Stacks[0].Outputs[?OutputKey=='GuardFunctionName'].OutputValue | [0]" `
  --output text `
  --no-cli-pager).Trim()

$statusPath = Join-Path $env:TEMP "lien-deployment-guard-status.json"
$candidatePath = Join-Path $env:TEMP "lien-deployment-guard-candidate.json"
$statusPayloadPath = Join-Path $env:TEMP "lien-deployment-guard-status-payload.json"
$candidatePayloadPath = Join-Path $env:TEMP "lien-deployment-guard-candidate-payload.json"
try {
  [IO.File]::WriteAllText($statusPayloadPath, '{"mode":"status"}', [Text.UTF8Encoding]::new($false))
  & aws lambda invoke `
    --function-name $functionName `
    --payload "fileb://$statusPayloadPath" `
    $statusPath `
    @profileArguments `
    --region $region `
    --no-cli-pager | Out-Null
  $status = Get-Content -Raw -LiteralPath $statusPath | ConvertFrom-Json
  if ($status.status -ne "protected") { throw "Deployment guard status check failed." }

  $candidatePayload = @{ mode = "validate-candidate"; candidateTaskDefinition = "$($lock.taskDefinitionArn)-unapproved" } | ConvertTo-Json -Compress
  [IO.File]::WriteAllText($candidatePayloadPath, $candidatePayload, [Text.UTF8Encoding]::new($false))
  & aws lambda invoke `
    --function-name $functionName `
    --payload "fileb://$candidatePayloadPath" `
    $candidatePath `
    @profileArguments `
    --region $region `
    --no-cli-pager | Out-Null
  $candidate = Get-Content -Raw -LiteralPath $candidatePath | ConvertFrom-Json
  if ($candidate.allowed -ne $false) { throw "Unapproved candidate validation did not fail closed." }
} finally {
  Remove-Item -LiteralPath $statusPath,$candidatePath,$statusPayloadPath,$candidatePayloadPath -Force -ErrorAction SilentlyContinue
}

Write-Host "AWS deployment protection is active."
Write-Host "Approved task: $($lock.taskDefinitionArn)"
Write-Host "Approved digest: $($lock.imageDigest)"
Write-Host "Local application deployment: blocked"
