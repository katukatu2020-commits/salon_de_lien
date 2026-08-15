param(
  [string]$TaskDefinition = "salon-de-lien-staging-web:22",
  [string]$SecretId = "salon-de-lien-staging/application",
  [string]$Profile = "salon-de-lien-deploy",
  [string]$Region = "ap-northeast-1"
)

$ErrorActionPreference = "Stop"

$definition = & aws ecs describe-task-definition `
  --task-definition $TaskDefinition `
  --profile $Profile `
  --region $Region `
  --query taskDefinition `
  --output json `
  --no-cli-pager | ConvertFrom-Json

$container = $definition.containerDefinitions[0]

function Set-EnvironmentValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $entry = $container.environment | Where-Object { $_.name -eq $Name }
  if ($entry) {
    $entry.value = $Value
    return
  }

  $container.environment += [pscustomobject]@{
    name = $Name
    value = $Value
  }
}

Set-EnvironmentValue -Name "GMAIL_AUTO_SYNC_ENABLED" -Value "true"
Set-EnvironmentValue -Name "GMAIL_SYNC_INTERVAL_SECONDS" -Value "60"
Set-EnvironmentValue -Name "OPENAI_MODEL" -Value "gpt-4.1-mini"
Set-EnvironmentValue -Name "COMMUNITY_AI_COMMENT_ENABLED" -Value "true"
Set-EnvironmentValue -Name "COMMUNITY_AI_COMMENT_INTERVAL_SECONDS" -Value "600"

$applicationSecretArn = (& aws secretsmanager describe-secret `
  --secret-id $SecretId `
  --profile $Profile `
  --region $Region `
  --query ARN `
  --output text `
  --no-cli-pager).Trim()

if (-not $applicationSecretArn -or $applicationSecretArn -eq "None") {
  throw "The application secret ARN could not be resolved."
}

$syncSecret = $container.secrets | Where-Object { $_.name -eq "GMAIL_SYNC_CRON_SECRET" }
$syncSecretReference = "${applicationSecretArn}:GMAIL_SYNC_CRON_SECRET::"
if ($syncSecret) {
  $syncSecret.valueFrom = $syncSecretReference
} else {
  $container.secrets += [pscustomobject]@{
    name = "GMAIL_SYNC_CRON_SECRET"
    valueFrom = $syncSecretReference
  }
}

$openAiSecret = $container.secrets | Where-Object { $_.name -eq "OPENAI_API_KEY" }
$openAiSecretReference = "${applicationSecretArn}:OPENAI_API_KEY::"
if ($openAiSecret) {
  $openAiSecret.valueFrom = $openAiSecretReference
} else {
  $container.secrets += [pscustomobject]@{
    name = "OPENAI_API_KEY"
    valueFrom = $openAiSecretReference
  }
}

$registration = [ordered]@{
  family = $definition.family
  taskRoleArn = $definition.taskRoleArn
  executionRoleArn = $definition.executionRoleArn
  networkMode = $definition.networkMode
  containerDefinitions = $definition.containerDefinitions
  volumes = $definition.volumes
  requiresCompatibilities = $definition.requiresCompatibilities
  cpu = $definition.cpu
  memory = $definition.memory
}
if ($null -ne $definition.runtimePlatform) {
  $registration.runtimePlatform = $definition.runtimePlatform
}

$definitionPath = Join-Path ([IO.Path]::GetTempPath()) "lien-gmail-task-$([Guid]::NewGuid().ToString('N')).json"

try {
  [IO.File]::WriteAllText(
    $definitionPath,
    ($registration | ConvertTo-Json -Depth 100),
    [Text.UTF8Encoding]::new($false)
  )

  $newDefinition = (& aws ecs register-task-definition `
    --cli-input-json "file://$definitionPath" `
    --profile $Profile `
    --region $Region `
    --query "taskDefinition.taskDefinitionArn" `
    --output text `
    --no-cli-pager).Trim()

  if (-not $newDefinition -or $newDefinition -eq "None") {
    throw "The Gmail auto-sync task definition could not be registered."
  }

  Write-Output $newDefinition
} finally {
  Remove-Item -LiteralPath $definitionPath -Force -ErrorAction SilentlyContinue
}
