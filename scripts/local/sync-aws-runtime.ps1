param(
  [string]$OutputRoot = ".artifacts/aws-runtime-parity"
)

$ErrorActionPreference = "Stop"

$ExpectedImage = "009293460979.dkr.ecr.ap-northeast-1.amazonaws.com/salon-de-lien-staging-app@sha256:51884dfb47f7a8b9adaacb1f0350e890d8a577fb17047c5c00e0ade8681d7170"
$ExpectedDigest = "sha256:51884dfb47f7a8b9adaacb1f0350e890d8a577fb17047c5c00e0ade8681d7170"
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
  $items = @(".next", "public", "prisma", "scripts", "src")
  $topLevelFiles = docker run --rm --entrypoint sh $ExpectedImage -c "find /app -maxdepth 1 -type f -printf '%f\n' | sort"
  if ($LASTEXITCODE -ne 0 -or -not $topLevelFiles) {
    throw "Failed to enumerate top-level runtime files."
  }
  $items += @($topLevelFiles)

  foreach ($item in $items) {
    docker cp "${containerId}:/app/$item" $destination
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to copy /app/$item from the approved runtime image."
    }
  }

  $metadata = [ordered]@{
    capturedAt = (Get-Date).ToString("o")
    source = "approved AWS ECS runtime image"
    taskDefinitionRevision = 414
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
  find . -maxdepth 1 -type f -printf '%P\n'
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
