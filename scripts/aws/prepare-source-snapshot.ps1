param(
  [string]$Destination = (Join-Path $env:TEMP "salon-de-lien-secure-source"),
  [switch]$CreateArchive
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$repoRoot = [IO.Path]::GetFullPath($repoRoot)
$destinationPath = [IO.Path]::GetFullPath($Destination)
$tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $destinationPath.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Secure source snapshots must stay inside TEMP: $tempRoot"
}

if (Test-Path -LiteralPath $destinationPath) {
  Remove-Item -LiteralPath $destinationPath -Recurse -Force
}
[IO.Directory]::CreateDirectory($destinationPath) | Out-Null

$rootFiles = @(
  ".dockerignore",
  ".env.example",
  ".eslintrc.json",
  ".gitignore",
  ".vercelignore",
  "AI_HANDOFF_INSTALL.md",
  "Dockerfile",
  "README.md",
  "UI_APPEARANCE_SUMMARY.md",
  "cdk.context.json",
  "docker-compose.yml",
  "next-env.d.ts",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "postcss.config.js",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json"
)
$sourceDirectories = @(".github", "docs", "infrastructure", "prisma", "public", "scripts", "src", "tests", "tools")
$excludedDirectoryNames = @(
  ".git", ".next", ".vercel", "node_modules", "backups", "cdk.out", "coverage",
  "playwright-report", "test-results", "tmp", "identity-results-preview",
  "coupon_font_tiny_runtime_setup_v3", "screenshots"
)
$excludedFileNames = @(
  ".env", ".env.local", ".gmail-oauth-authorization-url.txt", "config.local.js",
  "credentials", "credentials.json", "token.json", "gmail-token.json"
)
$excludedExtensions = @(
  ".7z", ".bak", ".db", ".db3", ".dump", ".key", ".log", ".pem", ".pfx", ".p12",
  ".sqlite", ".sqlite3", ".tsbuildinfo", ".zip"
)
$textExtensions = @(
  ".cjs", ".css", ".env", ".example", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".prisma", ".ps1", ".sh", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"
)
$secretPatterns = @(
  @{ Name = "AWS access key"; Pattern = "(?<![A-Z0-9])(AKIA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])" },
  @{ Name = "private key"; Pattern = "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" },
  @{ Name = "Google OAuth client secret"; Pattern = "GOCSPX-[A-Za-z0-9_-]{20,}" },
  @{ Name = "GitHub token"; Pattern = "gh[pousr]_[A-Za-z0-9]{30,}" },
  @{ Name = "OpenAI token"; Pattern = "sk-[A-Za-z0-9_-]{24,}" },
  @{ Name = "known plaintext password"; Pattern = "Robotto[0-9]+" }
)

function Copy-MaterializedFile([string]$SourcePath, [string]$RelativePath) {
  $targetPath = Join-Path $destinationPath $RelativePath
  $targetDirectory = Split-Path -Parent $targetPath
  [IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
  $bytes = [IO.File]::ReadAllBytes($SourcePath)
  [IO.File]::WriteAllBytes($targetPath, $bytes)
}

function Test-Excluded([IO.FileInfo]$File, [string]$RelativePath) {
  $segments = $RelativePath -split '[\\/]'
  if ($segments | Where-Object { $excludedDirectoryNames -contains $_ }) { return $true }
  if ($excludedFileNames -contains $File.Name) { return $true }
  if ($File.Name -like ".env.*" -and $File.Name -ne ".env.example") { return $true }
  if ($excludedExtensions -contains $File.Extension.ToLowerInvariant()) { return $true }
  if ($RelativePath -like "docs\demo\*") { return $true }
  if ($RelativePath -like "public\uploads\*" -or $RelativePath -like "public\customer-photos\*") { return $true }
  return $false
}

foreach ($relativePath in $rootFiles) {
  $sourcePath = Join-Path $repoRoot $relativePath
  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    Copy-MaterializedFile $sourcePath $relativePath
  }
}

$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
foreach ($directory in $sourceDirectories) {
  $sourceDirectory = Join-Path $repoRoot $directory
  if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) { continue }

  Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse -ErrorAction Stop | ForEach-Object {
    $sourceFullPath = [IO.Path]::GetFullPath($_.FullName)
    if (-not $sourceFullPath.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Source file escaped repository root: $sourceFullPath"
    }
    $relativePath = $sourceFullPath.Substring($repoPrefix.Length)
    if (Test-Excluded $_ $relativePath) { return }
    Copy-MaterializedFile $_.FullName $relativePath
  }
}

$secretFindings = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $destinationPath -File -Recurse | ForEach-Object {
  $extension = $_.Extension.ToLowerInvariant()
  if ($textExtensions -notcontains $extension -and $_.Name -notin @("Dockerfile", ".gitignore", ".dockerignore")) { return }
  $content = [IO.File]::ReadAllText($_.FullName)
  foreach ($secretPattern in $secretPatterns) {
    if ($content -match $secretPattern.Pattern) {
      $relativePath = $_.FullName.Substring($destinationPath.TrimEnd('\').Length + 1)
      $secretFindings.Add("$($secretPattern.Name): $relativePath")
    }
  }
}

if ($secretFindings.Count -gt 0) {
  throw ("Potential secrets found. Snapshot was not approved for upload:`n" + ($secretFindings -join "`n"))
}

$manifestFiles = Get-ChildItem -LiteralPath $destinationPath -File -Recurse | Sort-Object FullName | ForEach-Object {
  $relativePath = $_.FullName.Substring($destinationPath.TrimEnd('\').Length + 1).Replace('\', '/')
  [ordered]@{
    path = $relativePath
    bytes = $_.Length
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}
$manifest = [ordered]@{
  formatVersion = 1
  createdAtUtc = [DateTime]::UtcNow.ToString("o")
  source = "Salon de Lien sanitized source snapshot"
  exclusions = @("secrets", "environment files", "databases", "logs", "archives", "customer uploads", "build output")
  fileCount = @($manifestFiles).Count
  files = @($manifestFiles)
}
$manifestPath = Join-Path $destinationPath "SOURCE_SNAPSHOT_MANIFEST.json"
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))

$reparsePoints = Get-ChildItem -LiteralPath $destinationPath -File -Recurse | Where-Object {
  $_.Attributes -band [IO.FileAttributes]::ReparsePoint
}
if ($reparsePoints) {
  throw "Materialized source snapshot still contains reparse points."
}

$totalBytes = (Get-ChildItem -LiteralPath $destinationPath -File -Recurse | Measure-Object Length -Sum).Sum
Write-Host ("Secure source ready: {0} files, {1:N2} MB" -f @($manifestFiles).Count, ($totalBytes / 1MB))

if ($CreateArchive) {
  $archivePath = "$destinationPath.zip"
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
  Compress-Archive -Path (Join-Path $destinationPath "*") -DestinationPath $archivePath -CompressionLevel Optimal
  Write-Host ("Archive ready: {0}" -f $archivePath)
  Write-Output $archivePath
} else {
  Write-Output $destinationPath
}
