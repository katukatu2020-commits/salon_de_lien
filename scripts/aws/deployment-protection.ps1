function Get-LienDeploymentLock {
  param([string]$LockPath = "")

  $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  if (-not $LockPath) {
    $LockPath = Join-Path $repoRoot "infrastructure/deployment-protection/staging-lock.json"
  }
  if (-not (Test-Path -LiteralPath $LockPath -PathType Leaf)) {
    throw "Deployment lock was not found: $LockPath"
  }
  return Get-Content -Raw -LiteralPath $LockPath | ConvertFrom-Json
}

function Assert-LienApprovedAutomationContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Action,
    [string]$Profile = "salon-de-lien-deploy",
    [string]$Region = "ap-northeast-1",
    [string]$LockPath = ""
  )

  $lock = Get-LienDeploymentLock -LockPath $LockPath
  if ($lock.localApplicationDeploymentAllowed -ne $false) {
    throw "The deployment lock is invalid: localApplicationDeploymentAllowed must be false."
  }
  if ($env:GITHUB_ACTIONS -ne "true" -or $env:CI -ne "true") {
    throw "BLOCKED: '$Action' cannot run from a local PC. AWS application deployment is CI-only."
  }

  $identityArguments = @("sts", "get-caller-identity", "--region", $Region, "--output", "json", "--no-cli-pager")
  if ($Profile) { $identityArguments += @("--profile", $Profile) }
  $identity = & aws @identityArguments | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0 -or -not $identity) {
    throw "AWS identity could not be verified."
  }
  if ($identity.Account -ne $lock.accountId) {
    throw "BLOCKED: AWS account does not match the protected deployment lock."
  }

  $expectedRole = [Regex]::Escape([string]$lock.allowedAutomationRoleName)
  if ($identity.Arn -notmatch "^arn:aws:sts::$($lock.accountId):assumed-role/$expectedRole/") {
    throw "BLOCKED: only the approved GitHub deployment role may mutate the AWS application."
  }
}
