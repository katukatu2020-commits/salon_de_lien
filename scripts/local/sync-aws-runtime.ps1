param(
  [string]$OutputRoot = ".artifacts/aws-runtime-parity"
)

$ErrorActionPreference = "Stop"

$ExpectedImage = "009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:a0adf3c5d9cd82a6992e816df13654edde546ac9e7703ddd4057aa63f70766f7"
$ExpectedDigest = "sha256:a0adf3c5d9cd82a6992e816df13654edde546ac9e7703ddd4057aa63f70766f7"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$OutputBase = [IO.Path]::GetFullPath((Join-Path $RepositoryRoot $OutputRoot))

if (-not $OutputBase.StartsWith($RepositoryRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "OutputRoot must stay inside the repository: $OutputBase"
}

$imageId = (docker image inspect $ExpectedImage --format "{{.Id}}" 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $imageId -ne $ExpectedDigest) {
  throw "The approved AWS runtime image is not available locally or has the wrong digest. Expected $ExpectedDigest; got '$imageId'."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destination = Join-Path $OutputBase $stamp
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$containerName = "lien-runtime-audit-$stamp"
$containerId = (docker create --name $containerName $ExpectedImage).Trim()
if ($LASTEXITCODE -ne 0 -or -not $containerId) {
  throw "Failed to create the runtime audit container."
}

try {
  $items = @(
    ".next",
    "public",
    "prisma",
    "scripts",
    "src",
    "package.json",
    "package-lock.json",
    "server.js",
    "billing.js",
    "catalog-operations.js",
    "commercial-admin-v101.js",
    "inbound-email.js",
    "platform-operator.js",
    "public-site.js",
    "store-profile.js",
    "tenant-setup-client.js",
    "tenant-setup.js",
    "billing-migration.sql",
    "sms-compliance-migration.sql"
  )

  foreach ($item in $items) {
    docker cp "${containerId}:/app/$item" $destination
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to copy /app/$item from the approved runtime image."
    }
  }

  $metadata = [ordered]@{
    capturedAt = (Get-Date).ToString("o")
    source = "approved AWS ECS runtime image"
    taskDefinitionRevision = 266
    image = $ExpectedImage
    digest = $ExpectedDigest
    localImageId = $imageId
    output = $destination
  }
  $metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination "runtime-identity.json") -Encoding utf8

  $checksumCommand = @'
cd /app
{
  find .next public prisma scripts src -type f
  for file in package.json package-lock.json server.js billing.js catalog-operations.js commercial-admin-v101.js inbound-email.js platform-operator.js public-site.js store-profile.js tenant-setup-client.js tenant-setup.js billing-migration.sql sms-compliance-migration.sql; do
    if [ -f "$file" ]; then printf '%s\n' "$file"; fi
  done
} | sort | while IFS= read -r file; do sha256sum "$file"; done
'@
  $checksums = docker run --rm --entrypoint sh $ExpectedImage -c $checksumCommand
  if ($LASTEXITCODE -ne 0 -or -not $checksums) {
    throw "Failed to calculate checksums inside the approved runtime image."
  }
  $checksums | Set-Content -LiteralPath (Join-Path $destination "checksums.sha256") -Encoding ascii

  Write-Host "AWS runtime audit snapshot created: $destination"
  Write-Host "Image digest verified: $ExpectedDigest"
}
finally {
  docker rm $containerId 2>$null | Out-Null
}
