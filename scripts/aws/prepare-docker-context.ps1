param(
  [string]$Destination = (Join-Path $env:TEMP "salon-de-lien-docker-context")
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$repoRoot = [IO.Path]::GetFullPath($repoRoot)
$destinationPath = [IO.Path]::GetFullPath($Destination)
$tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $destinationPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Docker context must stay inside the current user's TEMP directory: $tempRoot"
}

if (Test-Path -LiteralPath $destinationPath) {
  Remove-Item -LiteralPath $destinationPath -Recurse -Force
}
[IO.Directory]::CreateDirectory($destinationPath) | Out-Null

$rootFiles = @(
  ".dockerignore",
  ".eslintrc.json",
  "Dockerfile",
  "next.config.mjs",
  "package.json",
  "package-lock.json",
  "postcss.config.js",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json"
)
$sourceDirectories = @("prisma", "public", "scripts", "src")
$excludedDirectoryNames = @("node_modules", ".next", "coverage", "test-results", "playwright-report", "cdk.out")
$excludedExtensions = @(".log", ".zip", ".tsbuildinfo")

function Copy-MaterializedFile([string]$SourcePath, [string]$RelativePath) {
  $targetPath = Join-Path $destinationPath $RelativePath
  $targetDirectory = Split-Path -Parent $targetPath
  [IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
  $bytes = [IO.File]::ReadAllBytes($SourcePath)
  [IO.File]::WriteAllBytes($targetPath, $bytes)
}

foreach ($relativePath in $rootFiles) {
  $sourcePath = Join-Path $repoRoot $relativePath
  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    Copy-MaterializedFile $sourcePath $relativePath
  }
}

foreach ($directory in $sourceDirectories) {
  $sourceDirectory = Join-Path $repoRoot $directory
  if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) { continue }

  Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse | ForEach-Object {
    $sourceFullPath = [IO.Path]::GetFullPath($_.FullName)
    $repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $sourceFullPath.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Source file escaped repository root: $sourceFullPath"
    }
    $relativePath = $sourceFullPath.Substring($repoPrefix.Length)
    $segments = $relativePath -split '[\\/]'
    if ($segments | Where-Object { $excludedDirectoryNames -contains $_ }) { return }
    if ($excludedExtensions -contains $_.Extension.ToLowerInvariant()) { return }
    Copy-MaterializedFile $_.FullName $relativePath
  }
}

$reparsePoints = Get-ChildItem -LiteralPath $destinationPath -File -Recurse | Where-Object {
  $_.Attributes -band [IO.FileAttributes]::ReparsePoint
}
if ($reparsePoints) {
  throw "Materialized Docker context still contains reparse points."
}

$totalBytes = (Get-ChildItem -LiteralPath $destinationPath -File -Recurse | Measure-Object Length -Sum).Sum
Write-Host ("Docker context ready: {0} ({1:N2} MB)" -f $destinationPath, ($totalBytes / 1MB))
Write-Output $destinationPath
