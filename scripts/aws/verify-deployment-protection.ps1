param(
  [string]$Profile = "salon-de-lien-deploy",
  [string]$LockPath = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot
. (Join-Path $PSScriptRoot "common.ps1")
. (Join-Path $PSScriptRoot "deployment-protection.ps1")
Initialize-LienAwsCli

$lock = Get-LienDeploymentLock -LockPath $LockPath
$profileArguments = @()
if ($Profile) { $profileArguments = @("--profile", $Profile) }
$service = & aws ecs describe-services --cluster $lock.clusterName --services $lock.serviceName @profileArguments --region $lock.region --query "services[0]" --output json --no-cli-pager | ConvertFrom-Json
$repository = & aws ecr describe-repositories --repository-names $lock.ecrRepositoryName @profileArguments --region $lock.region --query "repositories[0]" --output json --no-cli-pager | ConvertFrom-Json
$protection = & aws cloudformation describe-stacks --stack-name $lock.protectionStackName @profileArguments --region $lock.region --query "Stacks[0]" --output json --no-cli-pager | ConvertFrom-Json
$application = & aws cloudformation describe-stacks --stack-name $lock.applicationStackName @profileArguments --region $lock.region --query "Stacks[0]" --output json --no-cli-pager | ConvertFrom-Json

$result = [ordered]@{
  serviceTaskDefinitionMatches = $service.taskDefinition -eq $lock.taskDefinitionArn
  serviceDesiredCountMatches = $service.desiredCount -eq $lock.desiredCount
  ecrTagsImmutable = $repository.imageTagMutability -eq "IMMUTABLE"
  applicationTerminationProtection = $application.EnableTerminationProtection -eq $true
  protectionStackReady = $protection.StackStatus -eq "CREATE_COMPLETE" -or $protection.StackStatus -eq "UPDATE_COMPLETE"
  protectionTerminationProtection = $protection.EnableTerminationProtection -eq $true
}

$result | ConvertTo-Json
if ($result.Values -contains $false) {
  throw "One or more AWS deployment protections are not active."
}
