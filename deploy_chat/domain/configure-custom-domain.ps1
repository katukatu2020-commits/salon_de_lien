param(
  [string]$DistributionId = "E23LI5IQDBD82Z",
  [string]$DomainName = "salon-de-lien.com",
  [string]$CertificateArn = "arn:aws:acm:us-east-1:009293460979:certificate/29eb8062-7289-4734-9b7b-46116464af0d"
)

$ErrorActionPreference = "Stop"

$response = aws cloudfront get-distribution-config --id $DistributionId --output json | ConvertFrom-Json
if (-not $response.ETag -or -not $response.DistributionConfig) {
  throw "CloudFront distribution configuration could not be loaded."
}

$config = $response.DistributionConfig
$config.Aliases = [pscustomobject]@{
  Quantity = 1
  Items = @($DomainName)
}
$config.ViewerCertificate = [pscustomobject]@{
  ACMCertificateArn = $CertificateArn
  SSLSupportMethod = "sni-only"
  MinimumProtocolVersion = "TLSv1.2_2021"
  CertificateSource = "acm"
}

$temporaryConfig = New-TemporaryFile
try {
  $json = $config | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText($temporaryConfig.FullName, $json, [System.Text.UTF8Encoding]::new($false))
  aws cloudfront update-distribution `
    --id $DistributionId `
    --if-match $response.ETag `
    --distribution-config "file://$($temporaryConfig.FullName)" `
    --query "Distribution.{Id:Id,DomainName:DomainName,Status:Status,Aliases:DistributionConfig.Aliases.Items,Certificate:DistributionConfig.ViewerCertificate.ACMCertificateArn}" `
    --output json
  if ($LASTEXITCODE -ne 0) {
    throw "CloudFront distribution update failed."
  }
}
finally {
  Remove-Item -LiteralPath $temporaryConfig.FullName -Force -ErrorAction SilentlyContinue
}
